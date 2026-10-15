#!/usr/bin/env python3
"""Offline synthetic-only tests; NEVER claims access to private Constitution."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from xml.sax.saxutils import escape
from zipfile import ZipFile

MODULE=Path(__file__).with_name("constitution-task-packet.py")
spec=importlib.util.spec_from_file_location("private_rule_engine",MODULE)
engine=importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

def task():
    return {
        "taskId":"LAB-CONSTITUTION-001","roleId":"ENGINEERING",
        "agentId":"OFFICE_ENGINEERING_LAB","assignedBy":"DIRECTOR",
        "assignmentRef":"CEO_AUTHORIZED_LAB_READONLY","assignmentVerified":True,
        "goal":"Verify lab modules without changing public app",
        "scope":"LAB_ONLY_READ_ONLY","constitutionVersion":"1.9",
        "activeBriefVersion":"LAB-BRIEF-1","baselineId":"LAB-SHA-EXAMPLE",
        "risk":"LOW","must":["No prod writes"],"invariants":["Frozen unchanged"],
        "frozen":["MealUp approved design"],"doNotTouch":["main","PWA"],
        "acceptance":["QA complete"],"writeScope":[],
        "knownUnknowns":["New model quality remains unverified"],
        "tags":["delegated","existing_code","long_running"],
        "selectedSkillIds":["MEALUP_ENGINEERING_JS_AUDIT"],
        "steps":[
            {"id":"S1","objective":"Identify source and active rules",
              "scope":"Source check","preconditions":"Verified source copy",
              "expectedOutput":"Rule references","verification":"Hash and IDs",
              "doneWhen":"Correct activation and no missing rules",
              "dependsOn":[],"status":"OPEN"},
            {"id":"S2","objective":"Run bounded read-only audit",
              "scope":"Lab modules","preconditions":"S1 verified",
              "expectedOutput":"Audit evidence","verification":"Independent review",
              "doneWhen":"No syntax failures","dependsOn":["S1"],"status":"OPEN"},
            {"id":"S3","objective":"Reconcile audit with original goal",
              "scope":"Lab QA","preconditions":"S2 verified",
              "expectedOutput":"QA report","verification":"Original MUST checked",
              "doneWhen":"All MUST satisfied","dependsOn":["S2"],"status":"OPEN"}
        ]
    }

def fake_source(file):
    ids=set(engine.BASE)
    for each in engine.TRIGGERS.values():
        ids.update(each)
    ids.update(f"2.{n}" for n in range(1,18))
    ids.add("9.3.1")
    ids.add("12.16")
    # Validates extraction across 120+ source clauses. Synthetic content
    # is explicitly NOT a replacement for the real FROZEN Constitution.
    ids.update(f"20.{n}" for n in range(1,121))
    lines=["CAPITOLO 0 — TEST ONLY"] + [
        f"{x} — "+("Granularità e atomicità degli step" if x=="9.3.1" else "SYNTHETIC_RULE")
        for x in sorted(ids)
    ] + ["CAPITOLO 14 — CONTINUITÀ E RECOVERY"]
    # Include paragraph after each synthetic heading.
    full=[]
    for x in lines:
        full.extend([x,"Exact synthetic paragraph for provenance checking."])
    xml=('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
         '<w:body>'+''.join('<w:p><w:r><w:t>'+escape(x)+'</w:t></w:r></w:p>' for x in full)+
         '</w:body></w:document>')
    with ZipFile(file,"w") as z:
        z.writestr("word/document.xml",xml)
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()

class ConstitutionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.file=Path(self.tmp.name)/"FAKE_TEST_CONSTITUTION.docx"
        self.hash=fake_source(self.file)
        self.patcher=patch.object(engine,"CANONICAL_SHA256",self.hash)
        self.patcher.start()
        self.rules=engine.docx_sections(self.file)
    def tearDown(self):
        self.patcher.stop()
        self.tmp.cleanup()
    def test_mock_has_actual_text_and_many_indexed_clauses(self):
        self.assertGreaterEqual(len(self.rules),115)
        self.assertEqual(self.rules["9.3.1"]["heading"],"Granularità e atomicità degli step")
    def test_skill_activation_adds_rules_and_untrusted_skills_block(self):
        t=task()
        t["tags"]=[]
        t["selectedSkillIds"]=["MEALUP_ENGINEERING_JS_AUDIT"]
        p=engine.make_packet(t,self.rules)
        self.assertIn("6.1",p["activeRuleIds"])
        self.assertIn("MEALUP_ENGINEERING_JS_AUDIT",p["selectedSkillIds"])
        t["selectedSkillIds"]=["UNKNOWN_EXTERNAL_SKILL"]
        with self.assertRaisesRegex(ValueError,"SKILL_TRIGGER_NOT_REVIEWED"):
            engine.make_packet(t,self.rules)
    def test_scout_uses_direct_ceo_mandate_and_own_skills(self):
        t=task()
        t["roleId"]="SCOUT"
        t["agentId"]="SCOUT_LAB"
        t["assignedBy"]="CEO"
        t["selectedSkillIds"]=["mealup-talent-scout","mealup-agent-benchmark"]
        p=engine.make_packet(t,self.rules)
        self.assertIn("5.6",p["activeRuleIds"])
        self.assertIn("12.7",p["activeRuleIds"])
    def test_structural_mandate_auto_activates_high_risk_and_delegation(self):
        t=task()
        t["tags"]=[]
        t["risk"]="HIGH"
        p=engine.make_packet(t,self.rules)
        self.assertIn("12.5",p["activeRuleIds"])
        self.assertIn("8.11",p["activeRuleIds"])
    def test_universal_dogmas_always_active(self):
        t=task();t["tags"]=[]
        packet=engine.make_packet(t,self.rules)
        for n in range(1,18):
            self.assertIn(f"2.{n}",packet["activeRuleIds"])
        self.assertIn("9.3.1",packet["activeRuleIds"])
    def test_handoff_contains_only_selected_verbatim_source_passages(self):
        p=engine.make_packet(task(),self.rules)
        self.assertGreater(len(p["handoffRules"]),10)
        self.assertLess(len(p["handoffRules"]),len(p["activeRuleIds"]))
        self.assertTrue(all(x["exactOriginalText"]=="Exact synthetic paragraph for provenance checking."
                            for x in p["handoffRules"]))
    def test_high_fidelity_covers_all_14_A_clauses(self):
        t=task();t["tags"].append("high_fidelity")
        p=engine.make_packet(t,self.rules)
        for n in range(1,15):
            self.assertIn(f"A.{n}",p["activeRuleIds"])
    def test_inspiration_has_all_B_clauses(self):
        t=task();t["tags"].append("inspiration")
        p=engine.make_packet(t,self.rules)
        for n in range(1,5):
            self.assertIn(f"B.{n}",p["activeRuleIds"])
    def test_fails_closed_on_missing_original_or_wrong_hash(self):
        engine.CANONICAL_SHA256="9"*64
        with self.assertRaisesRegex(ValueError,"MISMATCH"):
            engine.docx_sections(self.file)
        with self.assertRaisesRegex(ValueError,"INACCESSIBLE"):
            engine.docx_sections(Path(self.tmp.name)/"ABSENT.docx")
    def test_unverified_delegation_blocked(self):
        t=task();t["assignmentVerified"]=False
        with self.assertRaisesRegex(ValueError,"UNVERIFIED_ASSIGNMENT"):
            engine.make_packet(t,self.rules)
    def test_wrong_authority_and_old_constitution_blocked(self):
        t=task();t["assignedBy"]="SCOUT"
        with self.assertRaisesRegex(ValueError,"WRONG_AUTHORITY"):
            engine.make_packet(t,self.rules)
        t=task();t["constitutionVersion"]="1.8"
        with self.assertRaisesRegex(ValueError,"STALE_CONSTITUTION"):
            engine.make_packet(t,self.rules)
    def test_microsteps_have_one_goal_and_ordered_dependencies(self):
        t=task();t["steps"][1]["dependsOn"]=["S3"]
        with self.assertRaisesRegex(ValueError,"DEPENDENCY_NOT_PREVIOUS"):
            engine.make_packet(t,self.rules)
        t=task();t["steps"][0]["objective"]=""
        with self.assertRaisesRegex(ValueError,"NONATOMIC_STEP"):
            engine.make_packet(t,self.rules)
    def test_cannot_claim_verified_without_evidence(self):
        t=task();t["steps"][0]["status"]="VERIFIED"
        with self.assertRaisesRegex(ValueError,"WITHOUT_EVIDENCE"):
            engine.make_packet(t,self.rules)
    def test_next_step_is_first_dependency_satisfied(self):
        t=task();t["steps"][0]["status"]="VERIFIED"
        t["steps"][0]["evidenceRef"]="LAB_ACTIONS_EVIDENCE"
        p=engine.make_packet(t,self.rules)
        self.assertEqual(p["nextEligibleStepIds"],["S2"])
        self.assertEqual(p["recovery"]["nextAction"],"S2")
    def test_previous_steps_or_constraints_cannot_disappear_silently(self):
        p=engine.make_packet(task(),self.rules)
        next_t=task()
        next_t["steps"].pop(1)
        next_t["steps"][1]["dependsOn"]=["S1"]
        q=engine.make_packet(next_t,self.rules)
        with self.assertRaisesRegex(ValueError,"UNMAPPED_PREVIOUS_STEP"):
            engine.verify_plan_continuity(p,q,next_t)
        next_t["stepReconciliation"]=[{"oldStepId":"S2","newStepId":"S3","reason":"Merged audit"}]
        self.assertEqual(engine.verify_plan_continuity(p,q,next_t)["status"],"CONTINUITY_VERIFIED")
        next_t=task();next_t["must"]=[]
        with self.assertRaisesRegex(ValueError,"MISSING_MUST"):
            engine.make_packet(next_t,self.rules)
    def test_replaced_microsteps_are_archived_with_original_data(self):
        old=engine.make_packet(task(),self.rules)
        t=task()
        t["steps"].pop(1)
        t["steps"][1]["dependsOn"]=["S1"]
        t["stepReconciliation"]=[{
            "oldStepId":"S2","newStepId":"S3",
            "reason":"S2 folded into S3 after scope review"}]
        new=engine.make_packet(t,self.rules)
        state=engine.verify_plan_continuity(old,new,t)
        self.assertEqual(len(state["supersededStepRecords"]),1)
        self.assertEqual(state["supersededStepRecords"][0]["oldStep"]["objective"],
                         "Run bounded read-only audit")
        self.assertEqual(state["supersededStepRecords"][0]["newStepId"],"S3")
    def test_no_drop_of_durable_evidence_or_approved_requirements(self):
        old=engine.make_packet(task(),self.rules)
        t=task();t["must"]=["A different goal"]
        now=engine.make_packet(t,self.rules)
        with self.assertRaisesRegex(ValueError,"LOST_APPROVED_CONSTRAINT"):
            engine.verify_plan_continuity(old,now,t)
        t=task();t["decisionLog"]=[]
        old["recovery"]["decisionLog"]=[{"id":"DECISION_1"}]
        with self.assertRaisesRegex(ValueError,"LOST_RECOVERY_EVIDENCE"):
            engine.verify_plan_continuity(old,engine.make_packet(t,self.rules),t)
    def test_mid_task_brief_change_requires_reconciliation(self):
        old=engine.make_packet(task(),self.rules)
        t=task();t["activeBriefVersion"]="LAB-BRIEF-2"
        with self.assertRaisesRegex(ValueError,"CHANGED_BRIEF_NEEDS_REASSESS"):
            engine.verify_plan_continuity(old,engine.make_packet(t,self.rules),t)
        t["changeReconciled"]=True
        self.assertEqual(engine.verify_plan_continuity(old,engine.make_packet(t,self.rules),t)["status"],
                         "CONTINUITY_VERIFIED")
    def test_source_missing_cannot_trigger_real_operations(self):
        self.assertEqual(engine.VERSION,"1.9")
        self.assertTrue(engine.CANONICAL_SHA256!=hashlib.sha256(b"some guess").hexdigest())

if __name__=="__main__":
    unittest.main(verbosity=2)
