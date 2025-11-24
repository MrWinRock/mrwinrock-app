import { getCollection } from '../../db/mongo';
import type { ProjectInput } from './projects.schema';
import { ObjectId } from 'mongodb';

const collection = () => getCollection<ProjectInput>('projects');

export async function listProjects() {
    return collection().find({}).sort({ order: 1, title: 1 }).toArray();
}

export async function createProject(doc: ProjectInput) {
    const res = await collection().insertOne(doc);
    return { ...doc, _id: res.insertedId };
}

export async function updateProject(doc: ProjectInput & { _id: string }) {
    const { _id, ...rest } = doc;
    await collection().updateOne({ _id: new ObjectId(_id) }, { $set: rest });
    return { ...doc };
}

export async function deleteProject(id: string) {
    await collection().deleteOne({ _id: new ObjectId(id) });
}