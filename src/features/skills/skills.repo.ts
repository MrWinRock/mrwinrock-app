import { ObjectId } from 'mongodb';
import { getCollection } from '../../db/mongo';
import type { SkillInput, CreateSkillInput } from './skills.schema';

const collection = () => getCollection<SkillInput>('skills');

// Predefined category order
const CATEGORY_ORDER = [
    'programming',
    'web',
    'mobile',
    'backend',
    'databases',
    'cloud',
    'devtools',
    'game',
    'design',
    'other',
] as const;

function getCategoryOrderFlag(category: string): number {
    const index = CATEGORY_ORDER.indexOf(category as typeof CATEGORY_ORDER[number]);
    return index >= 0 ? index + 1 : CATEGORY_ORDER.length + 1; // Unknown categories go to the end
}

async function getMaxOrderInCategory(category: string | undefined): Promise<number> {
    const query = category ? { category } : { category: { $exists: false } };
    const result = await collection()
        .find(query)
        .sort({ order: -1 })
        .limit(1)
        .toArray();
    return result.length > 0 ? result[0]!.order : 0;
}

async function reorderCategoryAfterDelete(category: string | undefined, deletedOrder: number) {
    const query = category ? { category } : { category: { $exists: false } };
    // Decrement order for all skills after the deleted one in same category
    await collection().updateMany(
        { ...query, order: { $gt: deletedOrder } },
        { $inc: { order: -1 } }
    );
}

export async function listSkills() {
    const skills = await collection().find({}).sort({ category: 1, order: 1, name: 1 }).toArray();
    
    // Group skills by category with order_flag
    const grouped: Record<string, { order_flag: number; skills: typeof skills }> = {};
    for (const skill of skills) {
        const categoryKey = skill.category || 'uncategorized';
        if (!grouped[categoryKey]) {
            grouped[categoryKey] = {
                order_flag: getCategoryOrderFlag(categoryKey),
                skills: []
            };
        }
        grouped[categoryKey]!.skills.push(skill);
    }
    
    // Sort by order_flag
    const sortedEntries = Object.entries(grouped).sort((a, b) => a[1].order_flag - b[1].order_flag);
    const result: Record<string, { order_flag: number; skills: typeof skills }> = {};
    for (const [key, value] of sortedEntries) {
        result[key] = value;
    }
    
    return result;
}

export async function createSkill(doc: CreateSkillInput) {
    const maxOrder = await getMaxOrderInCategory(doc.category);
    
    const finalDoc = {
        ...doc,
        order: maxOrder + 1,
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

    let finalOrder = rest.order;

    // If category changed, recalculate order for new category
    if (existing.category !== rest.category) {
        // Reorder old category
        await reorderCategoryAfterDelete(existing.category, existing.order);
        // Assign new order at end of new category
        const maxOrder = await getMaxOrderInCategory(rest.category);
        finalOrder = maxOrder + 1;
    }

    const finalDoc = { ...rest, order: finalOrder };
    await collection().updateOne({ _id: new ObjectId(_id) }, { $set: finalDoc });

    return {
        ...doc,
        order: finalOrder,
    };
}

export async function deleteSkill(id: string) {
    // Get the skill before deleting to know its category and order
    const skill = await collection().findOne({ _id: new ObjectId(id) });
    if (!skill) {
        throw new Error('Skill not found');
    }

    await collection().deleteOne({ _id: new ObjectId(id) });

    // Reorder remaining skills in the same category
    await reorderCategoryAfterDelete(skill.category, skill.order);
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

