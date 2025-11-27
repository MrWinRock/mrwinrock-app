import { ObjectId } from 'mongodb';
import { getCollection } from '../../db/mongo';
import type { SkillInput, CreateSkillInput } from './skills.schema';

const collection = () => getCollection<SkillInput>('skills');

async function checkOrderConflict(order: number, excludeId?: string) {
    const query: Record<string, unknown> = { order };
    if (excludeId) {
        query._id = { $ne: new ObjectId(excludeId) };
    }
    return collection().findOne(query);
}

async function getNextAvailableOrder(preferredOrder: number): Promise<number> {
    let currentOrder = preferredOrder;
    while (await checkOrderConflict(currentOrder)) {
        currentOrder++;
    }
    return currentOrder;
}

async function getMaxOrder(): Promise<number> {
    const result = await collection()
        .find({})
        .sort({ order: -1 })
        .limit(1)
        .toArray();
    return result.length > 0 ? result[0]!.order : -1;
}

export async function listSkills() {
    return collection().find({}).sort({ order: 1, name: 1 }).toArray();
}

export async function createSkill(doc: CreateSkillInput) {
    const maxOrder = await getMaxOrder();
    const finalDoc = { ...doc, order: maxOrder + 1 };
    const res = await collection().insertOne(finalDoc);

    return {
        ...finalDoc,
        _id: res.insertedId,
    };
}

export async function updateSkill(doc: SkillInput & { _id: string }) {
    const { _id, ...rest } = doc;

    const conflict = await checkOrderConflict(rest.order, _id);
    let finalOrder = rest.order;
    let orderAdjusted = false;

    if (conflict) {
        finalOrder = await getNextAvailableOrder(rest.order);
        orderAdjusted = true;
    }

    const finalDoc = { ...rest, order: finalOrder };
    await collection().updateOne({ _id: new ObjectId(_id) }, { $set: finalDoc });

    return {
        ...doc,
        order: finalOrder,
        _meta: orderAdjusted ? { orderAdjusted: true, originalOrder: rest.order, newOrder: finalOrder } : undefined
    };
}

export async function deleteSkill(id: string) {
    await collection().deleteOne({ _id: new ObjectId(id) });
}

export async function reorderSkills(items: Array<{ id: string; order: number }>) {
    // Validate all IDs exist first
    const ids = items.map(item => new ObjectId(item.id));
    const existingSkills = await collection().find({ _id: { $in: ids } }).toArray();

    if (existingSkills.length !== items.length) {
        throw new Error('One or more skill IDs not found');
    }

    const bulkOps = items.map(item => ({
        updateOne: {
            filter: { _id: new ObjectId(item.id) },
            update: { $set: { order: item.order } }
        }
    }));

    await collection().bulkWrite(bulkOps);

    return listSkills();
}