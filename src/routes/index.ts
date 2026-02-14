import { Elysia } from 'elysia';
import skills from '../features/skills/skills.routes.ts';
import projects from '../features/projects/projects.routes.ts';
import experience from '../features/experience/experience.routes.ts';
import contact from '../features/contact/contact.routes.ts';
import health from './health.routes.ts';

const routes = new Elysia()
    .group('/skills', app => app.use(skills))
    .group('/projects', app => app.use(projects))
    .group('/experience', app => app.use(experience))
    .group('/contact', app => app.use(contact))
    .group('/health', app => app.use(health));

export default routes;
