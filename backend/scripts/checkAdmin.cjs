const { PrismaClient } = require('../node_modules/@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const u = await p.user.findUnique({ where: { email: 'admin@durar.local' } });
    console.log(u ? 'exists' : 'missing');
  } catch (e) {
    console.error('error', e);
  } finally {
    await p.$disconnect();
  }
})();
