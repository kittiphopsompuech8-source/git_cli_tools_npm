# 🚀 Git-Pro CLI

**Git-Pro** คือเครื่องมือ Automation CLI (เขียนด้วย Node 100%) ที่ออกแบบมาเพื่อปฏิวัติ Workflow การทำงานกับ Git ของ Developer ช่วยจัดการและแก้ไขปัญหาทุกอย่างในเครื่องได้ในคำสั่งเดียวผ่าน **Keyboard-Driven Flow** โดยไม่ต้องสลับมือไปจับเมาส์คลิกบน Git GUI และไม่ต้องจำคำสั่ง Git ที่ซับซ้อน

---

## ✨ Features & Sub-commands

| Command | Description | Flow & Mechanics |
| :--- | :--- | :--- |
| `upload` | Deploy ในคลิกเดียว | Stage ไฟล์ $\rightarrow$ เลือกประเภท Semantic Commit $\rightarrow$ Push อัตโนมัติ |
| `add-remote` | จัดการ Remote | แสดงรายการ Remote ทั้งหมด และเปิดช่องให้เพิ่มอันใหม่ได้ทันที |
| `squash <N>` | รวม N Commit ล่าสุด | ยุบ Commit ให้เหลือหนึ่งเดียวด้วย Soft-reset (สะอาด ไม่ต้องผ่าน Vim) |
| `grab` | คัดลอกเฉพาะ Commit | เลือก Branch และ Commit ที่ต้องการ เพื่อทำการ cherry-pick ทันที |
| `purge-file <path>` | ลบไฟล์/ข้อมูลสำคัญถาวร | ลบไฟล์ขนาดใหญ่หรือความลับออกจาก Git History ถาวร พร้อมรัน git gc |
| `move-to <branch>` | ย้ายงานไป Branch อื่น | ย้ายโค้ดที่กำลังเขียนไป Branch ใหม่ทันทีผ่านกระบวนการ stash & pop |
| `undo` | ย้อนสถานะ (Rollback) | เลือกได้ 3 โหมด: Hard (ลบทั้งหมด) / Soft (เก็บใน Staged) / Mixed (เก็บใน Unstaged) |
| `stash-box` | จัดการงานที่บันทึกไว้ | ดูรายการที่ซ่อนไว้ พร้อมแสดง Colored Diff Preview ก่อน pop หรือ apply |
| `merge` | รวม Branch (Guided) | เลือกต้นทาง-ปลายทาง $\rightarrow$ ดู Diff $\rightarrow$ เลือก Strategy $\rightarrow$ เช็ก Conflict $\rightarrow$ Push |

---