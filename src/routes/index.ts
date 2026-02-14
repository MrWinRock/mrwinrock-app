import { Elysia } from 'elysia';
import skills from '../features/skills/skills.routes.ts';
import projects from '../features/projects/projects.routes.ts';
import experience from '../features/experience/experience.routes.ts';
import contact from '../features/contact/contact.routes.ts';
import health from './health.routes.ts';

const routes = new Elysia()
    .use(skills.prefix('/skills'))
    .use(projects.prefix('/projects'))
    .use(experience.prefix('/experience'))
    .use(contact.prefix('/contact'))
    .use(health.prefix('/health'));

export default routes;
