import { getCollection } from '../../db/mongo';
import type { ProjectInput } from './projects.schema';

const collection = () => getCollection<ProjectInput>('projects');

export async function listProjects() {
    return collection().find({}).sort({ order: 1, title: 1 }).toArray();
}

export async function createProject(doc: ProjectInput) {
    const res = await collection().insertOne(doc);
    return { ...doc, _id: res.insertedId };
}
