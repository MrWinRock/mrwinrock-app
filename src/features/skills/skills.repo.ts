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

async function getMaxCategoryOrder(category: string | undefined): Promise<number> {
    const query = category ? { category } : { category: { $exists: false } };
    const result = await collection()
        .find(query)
        .sort({ categoryOrder: -1 })
        .limit(1)
        .toArray();
    return result.length > 0 ? result[0]!.categoryOrder : -1;
}

async function reorderCategoryAfterDelete(category: string | undefined, deletedCategoryOrder: number) {
    const query = category ? { category } : { category: { $exists: false } };
    // Decrement categoryOrder for all skills after the deleted one
    await collection().updateMany(
        { ...query, categoryOrder: { $gt: deletedCategoryOrder } },
        { $inc: { categoryOrder: -1 } }
    );
}

export async function listSkills() {
    return collection().find({}).sort({ category: 1, categoryOrder: 1, order: 1, name: 1 }).toArray();
}

export async function createSkill(doc: CreateSkillInput) {
    const maxOrder = await getMaxOrder();
    const maxCategoryOrder = await getMaxCategoryOrder(doc.category);
    
    const finalDoc = {
        ...doc,
        order: maxOrder + 1,
        categoryOrder: maxCategoryOrder + 1,
    };
    const res = await collection().insertOne(finalDoc);

    return {
        ...finalDoc,
        _id: res.insertedId,
    };
}

export async function updateSkill(doc: SkillInput & { _id: string }) {
    const { _id, ...rest } = doc;

    // Get existing skill to check if category changed
    const existing = await collection().findOne({ _id: new ObjectId(_id) });
    if (!existing) {
        throw new Error('Skill not found');
    }

    let finalCategoryOrder = rest.categoryOrder;

    // If category changed, recalculate categoryOrder for new category
    if (existing.category !== rest.category) {
        // Reorder old category
        await reorderCategoryAfterDelete(existing.category, existing.categoryOrder);
        // Assign new categoryOrder in new category
        const maxCategoryOrder = await getMaxCategoryOrder(rest.category);
        finalCategoryOrder = maxCategoryOrder + 1;
    }

    const conflict = await checkOrderConflict(rest.order, _id);
    let finalOrder = rest.order;
    let orderAdjusted = false;

    if (conflict) {
        finalOrder = await getNextAvailableOrder(rest.order);
        orderAdjusted = true;
    }

    const finalDoc = { ...rest, order: finalOrder, categoryOrder: finalCategoryOrder };
    await collection().updateOne({ _id: new ObjectId(_id) }, { $set: finalDoc });

    return {
        ...doc,
        order: finalOrder,
        categoryOrder: finalCategoryOrder,
        _meta: orderAdjusted ? { orderAdjusted: true, originalOrder: rest.order, newOrder: finalOrder } : undefined
    };
}

export async function deleteSkill(id: string) {
    // Get the skill before deleting to know its category and categoryOrder
    const skill = await collection().findOne({ _id: new ObjectId(id) });
    if (!skill) {
        throw new Error('Skill not found');
    }

    await collection().deleteOne({ _id: new ObjectId(id) });

    // Reorder remaining skills in the same category
    await reorderCategoryAfterDelete(skill.category, skill.categoryOrder);
}

export async function reorderSkills(items: Array<{ id: string; order?: number; categoryOrder?: number }>) {
    // Validate all IDs exist first
    const ids = items.map(item => new ObjectId(item.id));
    const existingSkills = await collection().find({ _id: { $in: ids } }).toArray();

    if (existingSkills.length !== items.length) {
        throw new Error('One or more skill IDs not found');
    }

    const bulkOps = items.map(item => {
        const updateFields: Record<string, number> = {};
        if (item.order !== undefined) {
            updateFields.order = item.order;
        }
        if (item.categoryOrder !== undefined) {
            updateFields.categoryOrder = item.categoryOrder;
        }
        return {
            updateOne: {
                filter: { _id: new ObjectId(item.id) },
                update: { $set: updateFields }
            }
        };
    });

    await collection().bulkWrite(bulkOps);

    return listSkills();
}
