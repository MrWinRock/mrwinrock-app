import { ObjectId } from 'mongodb';
import { getCollection } from '../../db/mongo';
import type { SkillInput } from './skills.schema';

const collection = () => getCollection<SkillInput>('skills');

export async function listSkills() {
    return collection().find({}).sort({ order: 1, name: 1 }).toArray();
}

export async function createSkill(doc: SkillInput) {
    const res = await collection().insertOne(doc);
    return { ...doc, _id: res.insertedId };
}

export async function updateSkill(doc: SkillInput & { _id: string }) {
    const { _id, ...rest } = doc;
    await collection().updateOne({ _id: new ObjectId(_id) }, { $set: rest });
    return { ...doc };
}

export async function deleteSkill(id: string) {
    await collection().deleteOne({ _id: new ObjectId(id) });
}