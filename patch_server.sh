sed -i 's/startServer();/if (!process.env.VERCEL) { startServer(); }/g' server.ts
