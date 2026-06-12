#!/usr/bin/env node

import { execSync } from 'child_process';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const program = new Command();

// --- Helper ฟังก์ชันสำหรับรันคำสั่ง Terminal ---
function run(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
        return null;
    }
}

// ฟังก์ชันรันคำสั่งแบบยอมให้พ่น Error ออกหน้าจอตรงๆ (สำหรับคำสั่งซับซ้อน)
function runWithInherit(command) {
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        return false;
    }
}

// เช็กด่วนว่าเป็น Git Repo หรือไม่
function checkGitRepo() {
    if (!run('git rev-parse --is-inside-work-tree')) {
        p.log.error(pc.red('❌ โฟลเดอร์นี้ไม่ใช่ Git Repository! กรุณารันในโปรเจกต์ Git'));
        process.exit(1);
    }
}

// --- เริ่มต้นโปรแกรมหลักกำหนดหัวข้อ ---
program
    .name('git-pro')
    .description('The Ultimate Git Automation CLI Tool written in Node.js')
    .version('1.0.0');

// ==========================================
// 1. COMMAND: upload
// ==========================================
program
    .command('upload')
    .description('Stage -> Interactive Semantic Commit -> Auto Push')
    .action(async () => {
        p.intro(pc.inverse(pc.cyan(' 🚀 UPLOAD WORKFLOW ')));
        
        // Auto Init
        if (!run('git rev-parse --is-inside-work-tree')) {
            p.log.warn('Not a git repo. Auto initializing...');
            run('git init');
            run('git branch -M main');
        }

        // Check Remote
        let remotes = run('git remote -v');
        if (!remotes) {
            const url = await p.text({ message: 'ไม่พบ Remote! กรุณากรอก Remote URL:' });
            if (p.isCancel(url) || !url) return p.cancel('ยกเลิกงาน');
            run(`git remote add origin ${url}`);
        }

        // Check Changes
        if (!run('git status --porcelain')) {
            p.outro(pc.green('✨ ไม่มีไฟล์เปลี่ยนแปลง ทุกอย่างอัปเดตแล้ว!'));
            return;
        }

        run('git add .');

        const commitType = await p.select({
            message: 'เลือกประเภทการ Commit (Semantic Commit):',
            options: [
                { value: 'feat', label: '🚀 feat:', hint: 'เพิ่มฟีเจอร์ใหม่' },
                { value: 'fix', label: '🛠️  fix:', hint: 'แก้ไขบั๊ก' },
                { value: 'docs', label: '📝 docs:', hint: 'อัปเดตเอกสาร' },
                { value: 'refactor', label: '♻️  refactor:', hint: 'ปรับปรุงโครงสร้างโค้ด' },
                { value: 'chore', label: '🔩 chore:', hint: 'งานจิปาถะ/ตั้งค่าระบบ' },
            ]
        });
        if (p.isCancel(commitType)) return;

        const commitMsg = await p.text({ message: 'ระบุข้อความ Commit Message:' });
        if (p.isCancel(commitMsg) || !commitMsg) return;

        const finalMsg = `${commitType}: ${commitMsg}`;
        run(`git commit -m "${finalMsg}"`);

        const s = p.spinner();
        const branch = run('git branch --show-current') || 'main';
        s.start(`กำลังดันโค้ดขึ้น origin/${branch}...`);
        
        try {
            run(`git push -u origin ${branch}`);
            s.stop('ดันโค้ดเสร็จสมบูรณ์!');
            p.outro(pc.green('🎉 ดันงานขึ้นคลาวด์เรียบร้อยแล้ว!'));
        } catch {
            s.stop(pc.red('Push พัง!'));
            p.log.error('กรุณาเช็กสิทธิ์เน็ตเวิร์กหรือ Link Repository');
        }
    });

// ==========================================
// 2. COMMAND: add-remote
// ==========================================
program
    .command('add-remote')
    .description('ดูรายการ Remote และเปิดช่องเพิ่มอันใหม่ทันที')
    .action(async () => {
        checkGitRepo();
        p.intro(pc.cyan('🌐 MANAGING REMOTES'));
        
        const existingRemotes = run('git remote -v') || pc.dim('ไม่มี Remote ผูกอยู่');
        p.log.info(`${pc.bold('รายการปัจจุบัน:')}\n${existingRemotes}`);

        const name = await p.text({ message: 'ระบุชื่อ Remote ใหม่:', placeholder: 'origin หรือ upstream' });
        if (p.isCancel(name) || !name) return;

        const url = await p.text({ message: 'ระบุ URL ปลายทาง:', placeholder: 'git@github.com:... หรือ https://...' });
        if (p.isCancel(url) || !url) return;

        run(`git remote add ${name} ${url}`);
        p.outro(pc.green(`✅ เพิ่ม Remote [${name}] สำเร็จเรียบร้อย!`));
    });

// ==========================================
// 3. COMMAND: squash <N>
// ==========================================
program
    .command('squash <N>')
    .description('ยุบ N Commit ล่าสุดด้วย Soft-reset (สะอาด ไม่ผ่าน Vim)')
    .action(async (N) => {
        checkGitRepo();
        p.intro(pc.yellow(`🥞 SQUASH COMMITS (หลอมรวม ${N} รายการ)`));

        const count = parseInt(N, 10);
        if (isNaN(count) || count < 2) {
            p.log.error('❌ จำนวน Commit ที่จะรวมต้องเป็นตัวเลขและมากกว่า 1 ขึ้นไป');
            return;
        }

        const s = p.spinner();
        s.start('กำลังดึงประวัติกลับมาไว้ที่ Staged (Soft Reset)...');
        const resetResult = run(`git reset --soft HEAD~${count}`);
        s.stop('Soft Reset เรียบร้อย โค้ดทั้งหมดกองรอรวมร่างแล้ว');

        if (resetResult === null) {
            p.log.error('❌ ไม่สามารถทำ Soft Reset ได้ ประวัติในอดีตอาจไม่ยาวพอ');
            return;
        }

        const newMsg = await p.text({ 
            message: 'ระบุข้อความใหม่สำหรับ Commit ที่รวมร่างแล้ว:',
            placeholder: 'feat(core): combined multiple local updates'
        });
        if (p.isCancel(newMsg) || !newMsg) return;

        run(`git commit -m "${newMsg}"`);
        p.outro(pc.green(`✅ รวมร่างเป็น 1 Commit สะอาดสะอ้านเรียบร้อย!`));
    });

// ==========================================
// 4. COMMAND: grab
// ==========================================
program
    .command('grab')
    .description('เลือก Branch และเลือกตัด Commit ข้ามสายพันธุ์ (Cherry-pick)')
    .action(async () => {
        checkGitRepo();
        p.intro(pc.magenta('🍒 CHERRY-PICK WIZARD (ขโมยโค้ด)'));

        // ดึงรายชื่อ Branch ทั้งหมดในเครื่อง
        const branchesRaw = run('git branch --format="%(refname:short)"') || '';
        const branches = branchesRaw.split('\n').filter(Boolean);

        const sourceBranch = await p.select({
            message: 'เลือก Branch ต้นทางที่ต้องการไปคัดลอกรอบมา:',
            options: branches.map(b => ({ value: b, label: b }))
        });
        if (p.isCancel(sourceBranch)) return;

        // ดึง 10 คอมมิตล่าสุดจากบลันช์ต้นทางนั้น
        const commitsRaw = run(`git log ${sourceBranch} -n 10 --oneline`) || '';
        if (!commitsRaw) {
            p.log.error('ไม่พบประวัติ Commit บนบลันช์นั้นเลย');
            return;
        }
        
        const commits = commitsRaw.split('\n').filter(Boolean);

        const selectedCommitLine = await p.select({
            message: 'เลือกรอบคอมมิตที่อยากจะเด็ดหัวมาใส่บลันช์เราปัจจุบัน:',
            options: commits.map(c => {
                const hash = c.split(' ')[0];
                return { value: hash, label: c };
            })
        });
        if (p.isCancel(selectedCommitLine)) return;

        const s = p.spinner();
        s.start(`กำลังรันกระบวนการสอยโค้ดคอมมิต ${selectedCommitLine}...`);
        try {
            run(`git cherry-pick ${selectedCommitLine}`);
            s.stop('สอยสำเร็จ!');
            p.outro(pc.green(`🎉 ดึงพลังงานโค้ดรอบ ${selectedCommitLine} มาใส่ร่างปัจจุบันสำเร็จ!`));
        } catch {
            s.stop(pc.red('เกิดการชนกัน (Conflict)!'));
            p.log.warn('โค้ดบางจุดอาจชนกันรุนแรง กรุณาพิมพ์แก้ไขหน้างาน หรือสั่งยกเลิกด้วย git cherry-pick --abort');
        }
    });

// ==========================================
// 5. COMMAND: purge-file <path>
// ==========================================
program
    .command('purge-file <path>')
    .description('ลบไฟล์ขนาดใหญ่หรือข้อมูลสำคัญออกจาก Git History ย้อนหลังถาวร')
    .action(async (path) => {
        checkGitRepo();
        p.intro(pc.red('🔥 CRIMINAL HISTORY PURGE (ลบล้างประวัติบาป)'));

        p.log.warn(`⚠️  คำสั่งนี้จะลบไฟล์ [${path}] ออกจาก "ทุกประวัติคอมมิตย้อนหลังในอดีตทั้งหมด" ถาวร!`);
        const confirm = await p.confirm({ message: 'คุณแน่ใจใช่ไหมว่าจะทำลายหลักฐานนี้? (ย้อนกลับไม่ได้)' });
        if (!confirm || p.isCancel(confirm)) return p.cancel('ยกเลิกการกวาดล้าง');

        const s = p.spinner();
        s.start('กำลังกรองระบบเขียนประวัติศาสตร์ใหม่ย้อนหลัง (Filter-Branch)...');
        
        // สั่งลบประวัติแบบดุดัน
        run(`git filter-branch --force --index-filter "git rm --cached --ignore-unmatch ${path}" --prune-empty --tag-name-filter cat -- --all`);
        
        s.message('กำลังบีบอัดและทำลายหน่วยความจำขยะ (Garbage Collection)...');
        run('rm -rf .git/refs/original/');
        run('git reflog expire --expire=now --all');
        run('git gc --prune=now --aggressive');
        
        s.stop('ลบเกลี้ยงเรียบร้อย!');
        p.outro(pc.green(`💀 ไฟล์ [${path}] ถูกลบหายไปจากมิติประวัติศาสตร์ของ Git เรียบร้อย!`));
    });

// ==========================================
// 6. COMMAND: move-to <branch>
// ==========================================
program
    .command('move-to <branch>')
    .description('ทำงานผิดบลันช์ช่างมัน! ย้ายงานค้างด่วนไปบลันช์ใหม่ด้วย stash & pop')
    .action(async (branch) => {
        checkGitRepo();
        p.intro(pc.blue('🔄 MOVE WORKSPACE RESCUE'));

        const s = p.spinner();
        s.start('กำลังซ่อนงานค้างลงถังเก็บสำรอง (Stashing)...');
        run('git stash');

        s.message(`กำลังสลับไปที่บลันช์ [${branch}] (จะสร้างใหม่ให้ทันทีถ้าไม่เจอ)...`);
        const hasBranch = run(`git branch --list ${branch}`);
        if (hasBranch) {
            run(`git checkout ${branch}`);
        } else {
            run(`git checkout -b ${branch}`);
        }

        s.message('กำลังคายโค้ดที่แอบเซฟไว้ออกมาวางแผงงานต่อ (Popping)...');
        run('git stash pop');
        
        s.stop('ย้ายค่ายย้ายงานสำเร็จ!');
        p.outro(pc.green(`🚀 ย้ายโค้ดทั้งหมดของคุณมาปักหลักที่บลันช์ [${branch}] ให้แล้ว ลุยงานต่อได้!`));
    });

// ==========================================
// 7. COMMAND: undo
// ==========================================
program
    .command('undo')
    .description('ย้อนสถานะย้อนเวลาถอยคอมมิต (Rollback) 3 โหมด')
    .action(async () => {
        checkGitRepo();
        p.intro(pc.red('↩️  THE UNDO BUTTON (ย้อนเวลา)'));

        const mode = await p.select({
            message: 'เลือกโหมดที่คุณต้องการย้อนเวลากลับไป (ถอยจาก Commit ล่าสุดออกไป 1 ก้าว):',
            options: [
                { value: 'soft', label: '🟢 Soft Undo', hint: 'ถอยคอมมิตออก แต่เก็บโค้ดไว้ในสถานะพร้อมคอมมิต (Staged)' },
                { value: 'mixed', label: '🟡 Mixed Undo', hint: 'ถอยคอมมิตออก แต่โค้ดกลับไปรอแก้ปกติ (Unstaged)' },
                { value: 'hard', label: '🔴 Hard Undo (อันตราย!)', hint: 'ลบโค้ดที่ทำทิ้งทั้งหมด ย้อนกลับไปบริสุทธิ์เหมือนคอมมิตล่าสุด' },
            ]
        });
        if (p.isCancel(mode)) return;

        if (mode === 'hard') {
            const doubleCheck = await p.confirm({ message: '⚠️  โหมด Hard จะลบโค้ดที่คุณเขียนค้างไว้ทิ้งทันที มั่นใจนะ?' });
            if (!doubleCheck || p.isCancel(doubleCheck)) return p.cancel('ยกเลิกการถอย');
        }

        run(`git reset --${mode} HEAD~1`);
        p.outro(pc.green(`↩️  ถอยทัพย้อนประวัติกลับไป 1 สเต็ปด้วยโหมด [${mode.toUpperCase()}] สำเร็จ!`));
    });

// ==========================================
// 8. COMMAND: stash-box
// ==========================================
program
    .command('stash-box')
    .description('กล่องส่องงานค้าง ดูรายการซ่อนพร้อม Diff และนำกลับมาใช้')
    .action(async () => {
        checkGitRepo();
        p.intro(pc.yellow('📦 STASH BOX MANAGER'));

        const stashListRaw = run('git stash list') || '';
        if (!stashListRaw) {
            p.outro(pc.green('กล่องว่างเปล่า ไม่มีงานเซฟค้างไว้เลยครับ!'));
            return;
        }

        const stashLines = stashListRaw.split('\n').filter(Boolean);

        const selectedStash = await p.select({
            message: 'เลือกถังเก็บค้างที่คุณอยากเข้าไปส่องและจัดการ:',
            options: stashLines.map(line => {
                const id = line.match(/stash@\{\d+\}/)[0];
                return { value: id, label: line };
            })
        });
        if (p.isCancel(selectedStash)) return;

        // ดึง Diff สรุปแบบมีสี พ่นออก Terminal ให้เดฟตรวจงานก่อน
        p.log.info(`${pc.bold('👁️  พรีวิวความเปลี่ยนแปลงในไฟล์:')}`);
        runWithInherit(`git stash show -p ${selectedStash} --color`);

        const action = await p.select({
            message: '\nเลือกสิ่งที่ต้องการทำกับ Stash นี้ต่อ:',
            options: [
                { value: 'pop', label: '💥 Pop', hint: 'ดึงโค้ดกลับมาใช้งาน และลบถังนี้ทิ้งทันที' },
                { value: 'apply', label: '📋 Apply', hint: 'ดึงโค้ดมาใช้เฉยๆ แต่ยังคงเก็บถังนี้ไว้สำรองอีกรอบ' },
                { value: 'drop', label: '🗑️  Drop', hint: 'ทำลายของข้างในทิ้งถาวร ไม่ดึงโค้ดกลับมา' }
            ]
        });
        if (p.isCancel(action)) return;

        run(`git stash ${action} ${selectedStash}`);
        p.outro(pc.green(`✅ จัดการ Stash ด้วยคำสั่ง [${action.toUpperCase()}] เรียบร้อยเรียบร้อย!`));
    });

// ==========================================
// 9. COMMAND: merge (Guided Integration)
// ==========================================
program
    .command('merge')
    .description('ตัวชี้แนะการรวม Branch แบบเป็นขั้นตอน ปลอดภัย ไม่หลุด')
    .action(async () => {
        checkGitRepo();
        p.intro(pc.cyan('🔀 GUIDED BRANCH MERGE (ตัวนำทางรวมบลันช์)'));

        const branchesRaw = run('git branch --format="%(refname:short)"') || '';
        const branches = branchesRaw.split('\n').filter(Boolean);
        const currentBranch = run('git branch --show-current') || 'main';

        const sourceBranch = await p.select({
            message: `คุณต้องการดึงโค้ดจาก Branch ไหน... เข้ามาที่บลันช์ปัจจุบัน [${currentBranch}]?`,
            options: branches.filter(b => b !== currentBranch).map(b => ({ value: b, label: b }))
        });
        if (p.isCancel(sourceBranch)) return;

        // ส่อง Diff ล่วงหน้าก่อนกดรวมร่างจริง
        p.log.info(pc.yellow(`📊 ไฟล์ที่จะแอบเปลี่ยนแปลงเมื่อนำมาควบรวม (${sourceBranch} -> ${currentBranch}):`));
        const diffSummary = run(`git diff --stat ${currentBranch}..${sourceBranch}`) || pc.dim('ไม่มีอะไรแตกต่างกันเลย');
        p.log.message(diffSummary);

        const strategy = await p.select({
            message: 'เลือกรูปแบบยุทธวิธีในการ Merge:',
            options: [
                { value: '--no-ff', label: '📦 Create Merge Commit (--no-ff)', hint: 'แบบมาตรฐาน: สร้างจุดตัดผูกปมในแผนภาพ สรุปงานชัดเจน' },
                { value: '--ff-only', label: '⚡ Fast-Forward Only', hint: 'เลื่อนเส้นประวัติไปตรงๆ (จะพังทันทีถ้าประวัติเครื่องไม่ตรงกัน)' },
                { value: '--squash', label: '🗜️  Merge Squash', hint: 'ยุบทุกเม็ดจากฝั่งนู้นมาขมวดปมเป็น 1 ต้อนรับเข้าฝั่งนี้' }
            ]
        });
        if (p.isCancel(strategy)) return;

        const confirm = await p.confirm({ message: `ยืนยันรันกระบวนการรวมร่างเลยไหม?` });
        if (!confirm || p.isCancel(confirm)) return p.cancel('ยกเลิกแผนการควบรวม');

        const s = p.spinner();
        s.start(`กำลังรวบรวมพลังคำสั่งเพื่อ Merge...`);
        
        try {
            // รันคำสั่ง Merge
            const mergeResult = run(`git merge ${strategy} ${sourceBranch}`);
            s.stop('ดำเนินการสำเร็จ!');
            
            p.log.success(pc.green('🎉 รวม Branch สำเร็จเรียบร้อย!'));
            if (mergeResult) p.log.message(pc.dim(mergeResult));

            const autoPush = await p.confirm({ message: `ต้องการกด Auto Push ขึ้นคลาวด์เลยทันทีไหม?` });
            if (autoPush && !p.isCancel(autoPush)) {
                s.start(`กำลัง Push ขึ้น origin/${currentBranch}...`);
                run(`git push origin ${currentBranch}`);
                s.stop('Push ขึ้นฟ้าเรียบร้อย!');
            }
        } catch {
            s.stop(pc.red('เกิดการชนกันอย่างรุนแรง (Conflict Detected)!'));
            p.log.error('❌ ข้อมูลชนกัน! กรุณาเปิดแอป Code เพื่อไล่เคลียร์จุดสัญลักษณ์หัวลูกศรให้เสร็จ ก่อนจะกดยืนยันเซฟต่อครับ');
        }
        
        p.outro(pc.cyan('🔚 เสร็จสิ้นภารกิจนำทางควบรวม'));
    });

// สั่งประมวลผลคำสั่งทั้งหมดผ่านหน้า Terminal
program.parse(process.argv);