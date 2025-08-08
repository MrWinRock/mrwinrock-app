import { Hono } from 'hono';
import skills from '../features/skills/skills.routes.ts';
import projects from '../features/projects/projects.routes.ts';
import experience from '../features/experience/experience.routes.ts';
import contact from '../features/contact/contact.routes.ts';
import health from './health.routes.ts';

const routes = new Hono();

routes.route('/skills', skills);
routes.route('/projects', projects);
routes.route('/experience', experience);
routes.route('/contact', contact);
routes.route('/health', health);

export default routes;
