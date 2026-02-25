import { PrismaClient } from '@prisma/client'  
const prisma = new PrismaClient()  
async function main() { try { const rows = await prisma.projectAssignment.findMany({ where: { status: 'PENDING_APPROVAL' }, include: { star: { select: { id: true, name: true, chineseName: true, email: true, avatarUrl: true } }, request: { select: { id: true, title: true, deadline: true, maxAssignees: true, categories: true, status: true, _count: { select: { assignments: { where: { status: { in: ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] } } } } } } } } }); console.log('Rows found:', rows.length); console.log(JSON.stringify(rows, null, 2).substring(0,200)); } catch(e) { console.error('Error:', e); } finally { await prisma.(); } }  
main();  
