#!/usr/bin/env python3
"""MealUp v1.9 protected-source rule activation and atomic task packet.
Standalone stdlib. Never prints canonical rule bodies by default; never runs agents.
A real FROZEN source is mandatory. GitHub's public repo stores only this code.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile

CANONICAL_SHA256 = "51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb"
VERSION = "1.9"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"
HEAD = re.compile(r"^((?:[0-9]+(?:\.[0-9]+){1,2}|[AB]\.[0-9]+))\s*[—–-]\s*(.+)$")
BASE = ("0.3", "0.4", "0.5", "0.6", "1.3", "1.5", "1.6", "1.8",
        "8.1", "8.2", "8.3", "8.6", "8.7", "8.9", "8.10",
        "9.1", "9.2", "9.3", "9.3.1", "9.4", "9.7", "9.8",
        "12.2", "12.6", "12.15", "13.5")
HANDOFF_ALWAYS = ("2.4", "2.8", "2.9", "2.11", "2.12", "2.17",
                  "8.3", "8.6", "8.7", "8.9", "9.3.1", "9.8", "12.6")
TRIGGERS = {
    "delegated": ("1.4", "8.4", "8.8", "8.11", "8.12", "8.13", "8.14", "8.15", "8.16"),
    "source_research": ("4.2", "4.4", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7"),
    "existing_code": ("4.1", "4.5", "6.1", "6.2", "6.3", "6.4", "6.5", "10.1"),
    "modification": ("3.4", "6.3", "6.4", "10.1", "10.2", "10.3", "10.7", "12.9"),
    "high_risk": ("6.6", "10.4", "10.5", "10.6", "12.4", "12.5", "12.7", "12.8"),
    "long_running": ("1.4", "9.6", "9.10", "11.1", "11.2", "11.5", "11.6", "14"),
    "parallel": ("8.14", "8.15", "11.3", "11.4"),
    "changed_mid_task": ("1.8", "8.11", "8.12", "9.9", "9.10", "14"),
    "failure": ("7.5", "7.6", "11.6", "11.7", "12.3", "12.10", "12.12", "14"),
    "high_fidelity": ("10.2", "A.1", "A.2", "A.3", "A.4", "A.5", "A.6", "A.7", "A.8", "A.9", "A.10", "A.11", "A.12", "A.13", "A.14"),
    "inspiration": ("B.1", "B.2", "B.3", "B.4"),
    "critical_system": ("12.7", "12.8", "12.14"),
    "state_transition": ("11.6", "12.8", "13.2", "14"),
}
ALLOWED_TAGS = frozenset(TRIGGERS)
STATUS = frozenset(("OPEN", "VERIFIED", "PARTIALLY_VERIFIED", "BLOCKED", "FAILED"))
NONEMPTY = lambda s: isinstance(s, str) and bool(s.strip())

def docx_sections(source):
    source = Path(source).resolve()
    if not source.is_file():
        raise ValueError("BLOCKED_CANONICAL_SOURCE_INACCESSIBLE")
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if sha != CANONICAL_SHA256:
        raise ValueError("BLOCKED_CANONICAL_VERSION_OR_SHA_MISMATCH")
    with ZipFile(source) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find("w:body", NS)
    entries = []
    for element in body:
        for para in ([element] if element.tag == W+"p" else element.findall(".//w:p", NS)):
            text = "".join(x.text or "" for x in para.findall(".//w:t", NS)).strip()
            if text:
                entries.append(text)
    rules = {}
    current = None
    for value in entries:
        if value.startswith("CAPITOLO 14 ") or value.startswith("CAPITOLO 14 —"):
            current = "14"; rules[current] = {"heading": value, "parts": []}
            continue
        h = HEAD.match(value)
        if h:
            # Original heading repeated in the initial ToC is ignored:
            # early sections have already finished when a heading appears.
            key, title = h.groups()
            current = key
            rules[key] = {"heading": title, "parts": []}
            continue
        if value.startswith(("CAPITOLO ", "PROTOCOLLO SPECIALE ", "APPENDICE A", "PRINCIPIO FINALE")):
            current = None
            continue
        if current is not None:
            rules[current]["parts"].append(value)
    if "9.3.1" not in rules or "14" not in rules or len(rules)<115:
        raise ValueError("BLOCKED_CANONICAL_RULE_EXTRACTION_INCOMPLETE")
    if "GRANULARIT" not in rules["9.3.1"]["heading"].upper():
        raise ValueError("BLOCKED_UNEXPECTED_ATOMICITY_HEADING")
    return {k: {"heading":v["heading"], "text":"\n".join(v["parts"])} for k,v in rules.items()}

def validate_task(t):
    needed = ["taskId","roleId","agentId","assignedBy","assignmentRef","goal",
              "scope","activeBriefVersion","baselineId","constitutionVersion",
              "must","invariants","frozen","doNotTouch","acceptance",
              "writeScope","steps","risk","tags","knownUnknowns","selectedSkillIds"]
    if not isinstance(t, dict) or any(k not in t for k in needed):
        raise ValueError("BLOCKED_INCOMPLETE_STRUCTURED_TASK")
    if any(not NONEMPTY(t[k]) for k in ("taskId","roleId","agentId","assignedBy","assignmentRef",
                                            "goal","scope","activeBriefVersion","baselineId","risk")):
        raise ValueError("BLOCKED_INCOMPLETE_SCOPE_OR_GOAL")
    if t["constitutionVersion"]!=VERSION:
        raise ValueError("BLOCKED_STALE_CONSTITUTION")
    if t["assignedBy"]!=("CEO" if t["roleId"]=="SCOUT" else "DIRECTOR"):
        raise ValueError("BLOCKED_WRONG_AUTHORITY")
    if t.get("assignmentVerified") is not True:
        raise ValueError("BLOCKED_UNVERIFIED_ASSIGNMENT")
    for key in ("must","invariants","frozen","doNotTouch","acceptance","writeScope","steps","tags","knownUnknowns","selectedSkillIds"):
        if not isinstance(t[key],list):
            raise ValueError("BLOCKED_BAD_"+key.upper())
    if not t["must"] or not t["acceptance"] or not t["steps"] or not t["invariants"]:
        raise ValueError("BLOCKED_MISSING_MUST_ACCEPTANCE_OR_STEPS")
    if set(t["tags"])-ALLOWED_TAGS:
        raise ValueError("BLOCKED_UNKNOWN_CONDITIONAL_TRIGGER")
    # Chosen specialist Skills also activate their own task-specific protocols.
    # Unknown/unreviewed Skill IDs cannot silently bypass the Constitution.
    catalog=json.loads(Path(__file__).with_name("constitution-skill-triggers.json")
                       .read_text(encoding="utf-8"))
    entries={e["id"]:e for e in catalog["entries"]}
    skill_tags=set()
    for skill_id in t["selectedSkillIds"]:
        entry=entries.get(skill_id)
        if entry is None or entry["role"]!=t["roleId"]:
            raise ValueError("BLOCKED_SKILL_TRIGGER_NOT_REVIEWED:"+str(skill_id))
        skill_tags.update(entry["tags"])
    if skill_tags-ALLOWED_TAGS:
        raise ValueError("BLOCKED_INVALID_SKILL_TRIGGER")
    # Structural risk/agency triggers cannot be silently omitted by a task author.
    auto={"delegated"} | skill_tags  # Every packet is addressed to a delegated office specialist.
    if len(t["steps"])>1:
        auto.add("long_running")
    if t["writeScope"]:
        auto.add("modification")
    if t["risk"].upper() in ("HIGH","MISSION_CRITICAL"):
        auto.add("high_risk")
    t["tags"]=sorted(set(t["tags"])|auto)
    ids=[]
    for i,s in enumerate(t["steps"]):
        if not isinstance(s,dict) or any(not NONEMPTY(s.get(key)) for key in
                ("id","objective","scope","preconditions","expectedOutput","verification","doneWhen")):
            raise ValueError("BLOCKED_NONATOMIC_STEP")
        if s.get("status") not in STATUS:
            raise ValueError("BLOCKED_UNKNOWN_STEP_STATUS")
        if not isinstance(s.get("dependsOn"),list):
            raise ValueError("BLOCKED_UNTRACED_DEPENDENCIES")
        if any(x not in ids for x in s["dependsOn"]):
            raise ValueError("BLOCKED_DEPENDENCY_NOT_PREVIOUS_STEP")
        if s["status"]=="VERIFIED" and not NONEMPTY(s.get("evidenceRef")):
            raise ValueError("BLOCKED_VERIFIED_STEP_WITHOUT_EVIDENCE")
        ids.append(s["id"])
    if len(set(ids))!=len(ids):
        raise ValueError("BLOCKED_DUPLICATE_STEP_ID")
    if "modification" in t["tags"] and not t["writeScope"]:
        raise ValueError("BLOCKED_MODIFICATION_MISSING_WRITE_SCOPE")
    return t

def activate(t, sections):
    ids = set(BASE)
    ids.update(k for k in sections if re.fullmatch(r"2\.[0-9]+",k))
    for tag in t["tags"]:
        ids.update(TRIGGERS[tag])
    # Section 14 is not numbered with individual subrules in the canonical text.
    unknown = sorted(ids-set(sections))
    if unknown:
        raise ValueError("BLOCKED_REQUIRED_RULE_MISSING:"+",".join(unknown))
    ordered = sorted(ids,key=lambda k:tuple(int(x) if x.isdigit() else ord(x)
                         for x in re.findall(r"\d+|[A-Z]",k)))
    critical = set(HANDOFF_ALWAYS)
    critical.update(TRIGGERS.get("delegated",()))
    critical.update(TRIGGERS.get("long_running",()) if "long_running" in t["tags"] else [])
    selected = [r for r in ordered if r in critical or r not in set(BASE)]
    return ordered, selected

def verify_plan_continuity(previous, current, task):
    """Fail closed if a revised plan drops a requirement or an open task."""
    if previous is None:
        return {"status":"NEW_PLAN_NO_PREDECESSOR", "mappedPreviousSteps":0}
    if previous.get("schema")!="MEALUP_CONSTITUTION_TASK_PACKET_V1" or (
        previous.get("canonicalSha256")!=CANONICAL_SHA256 or
        previous.get("taskId")!=current["taskId"]):
        raise ValueError("BLOCKED_PREVIOUS_PLAN_WRONG_VERSION_OR_TASK")
    for field in ("must","invariants","frozen","doNotTouch","acceptance","knownUnknowns"):
        before=previous.get(field,[])
        if not isinstance(before,list) or any(x not in current[field] for x in before):
            raise ValueError("BLOCKED_LOST_APPROVED_CONSTRAINT:"+field)
    if previous.get("goal")!=current["goal"] or (
        previous.get("activeBriefVersion")!=current["activeBriefVersion"] or
        previous.get("baselineId")!=current["baselineId"]):
        if task.get("changeReconciled") is not True:
            raise ValueError("BLOCKED_CHANGED_BRIEF_NEEDS_REASSESS")
    current_steps={x["id"]:x for x in current["steps"]}
    corrections=task.get("stepReconciliation",[])
    for old in previous.get("steps",[]):
        if old["id"] not in current_steps:
            linked=[r for r in corrections if r.get("oldStepId")==old["id"]]
            if len(linked)!=1 or not NONEMPTY(linked[0].get("reason")) or (
                linked[0].get("newStepId") not in current_steps):
                raise ValueError("BLOCKED_UNMAPPED_PREVIOUS_STEP:"+old["id"])
        elif old["status"]=="VERIFIED" and current_steps[old["id"]]["status"]!="VERIFIED":
            if task.get("changeReconciled") is not True:
                raise ValueError("BLOCKED_SILENT_LOSS_OF_VERIFIED_WORK")
    for fld in ("evidence","decisionLog","errorsAndPrevention","inFlightOperations"):
        old_items=previous.get("recovery",{}).get(fld,[])
        now_items=current["recovery"][fld]
        if any(item not in now_items for item in old_items):
            raise ValueError("BLOCKED_LOST_RECOVERY_EVIDENCE:"+fld)
    return {"status":"CONTINUITY_VERIFIED", "mappedPreviousSteps":len(previous["steps"])}

def make_packet(t, sections):
    t=validate_task(t)
    active,handoff=activate(t,sections)
    next_steps=[]
    verified = {s["id"] for s in t["steps"] if s["status"]=="VERIFIED"}
    for s in t["steps"]:
        if s["status"]=="OPEN" and all(x in verified for x in s["dependsOn"]):
            next_steps.append(s["id"])
    # Facts and plans from previous work stay represented by the full step ledger.
    return {
        "schema":"MEALUP_CONSTITUTION_TASK_PACKET_V1",
        "canonicalVersion":VERSION,"canonicalSha256":CANONICAL_SHA256,
        "taskId":t["taskId"],"roleId":t["roleId"],"agentId":t["agentId"],
        "goal":t["goal"],"scope":t["scope"],"activeBriefVersion":t["activeBriefVersion"],
        "baselineId":t["baselineId"],"risk":t["risk"],
        "selectedSkillIds":t["selectedSkillIds"],"skillTriggeredRules":t["tags"],
        "must":t["must"],"invariants":t["invariants"],"frozen":t["frozen"],
        "doNotTouch":t["doNotTouch"],"acceptance":t["acceptance"],
        "writeScope":t["writeScope"],"knownUnknowns":t["knownUnknowns"],
        "activeRuleIds":active,"handoffRuleIds":handoff,
        "handoffRules":[{"id":k,"title":sections[k]["heading"],
                          "exactOriginalText":sections[k]["text"]} for k in handoff],
        "steps":t["steps"],"nextEligibleStepIds":next_steps,
        "status":"PREPARED_WITH_CANONICAL_RULES_NOT_EXECUTED",
        "needsQA":True,"needsPostflight":True,
        "sourceLocation":"PRIVATE_AUTHORIZED_COPY_NOT_PUBLIC_REPOSITORY",
        "recovery":{
            "completedStepIds":[s["id"] for s in t["steps"] if s["status"]=="VERIFIED"],
            "openStepIds":[s["id"] for s in t["steps"] if s["status"]=="OPEN"],
            "blockedStepIds":[s["id"] for s in t["steps"] if s["status"]=="BLOCKED"],
            "lastVerifiedState":t.get("lastVerifiedState","UNKNOWN"),
            "runtimeState":"NOT_EXECUTED",
            "nextAction":next_steps[0] if next_steps else "REASSESS_OR_CLOSE",
            "evidence":t.get("evidence",[]),
            "decisionLog":t.get("decisionLog",[]),
            "errorsAndPrevention":t.get("errorsAndPrevention",[]),
            "inFlightOperations":t.get("inFlightOperations",[])
        }
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--canonical-docx",required=True)
    ap.add_argument("--task-json",required=True)
    ap.add_argument("--out",required=True)
    ap.add_argument("--previous-packet",required=False)
    args=ap.parse_args()
    # Output remains in local temp/private workspace, never in public repo.
    out=Path(args.out).resolve()
    if str(out).startswith(str(Path.cwd().resolve())+os.sep):
        raise ValueError("BLOCKED_PUBLIC_REPO_RULE_BODY_OUTPUT")
    sections=docx_sections(args.canonical_docx)
    t=json.loads(Path(args.task_json).read_text(encoding="utf-8"))
    packet=make_packet(t,sections)
    previous=(json.loads(Path(args.previous_packet).read_text(encoding="utf-8"))
              if args.previous_packet else None)
    packet["continuity"]=verify_plan_continuity(previous,packet,t)
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(packet,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":packet["status"],
        "taskId":packet["taskId"],"activeRuleCount":len(packet["activeRuleIds"]),
        "handoffRuleCount":len(packet["handoffRules"]),
        "steps":len(packet["steps"]),"nextStep":packet["recovery"]["nextAction"],
        "output":"PRIVATE_LOCAL_ONLY","docShaVerified":True}))
if __name__=="__main__":
    try: main()
    except Exception as err:
        print(json.dumps({"status":"BLOCKED","reason":str(err)}),file=sys.stderr)
        sys.exit(2)
