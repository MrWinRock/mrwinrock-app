import app from './src/app'
export default {
    port: Number(process.env.PORT ?? 8080),
    fetch: app.fetch,
}
