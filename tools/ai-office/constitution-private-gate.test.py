#!/usr/bin/env python3
"""Security checks: only synthetic DOCX; never transfer canonical original to CI."""
import importlib.util,json,os,stat,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).parent
s=importlib.util.spec_from_file_location("constitution_engine",ROOT/"constitution-task-packet.py")
eng=importlib.util.module_from_spec(s);s.loader.exec_module(eng)
t=importlib.util.spec_from_file_location("synthetic_cases",ROOT/"constitution-task-packet.test.py")
fixture=importlib.util.module_from_spec(t);t.loader.exec_module(fixture)
class PrivateGateTests(unittest.TestCase):
 def test_probe_metadata_only(self):
  import contextlib,io
  with tempfile.TemporaryDirectory() as d:
   file=Path(d)/"synthetic.docx";sha=fixture.fake_source(file)
   buf=io.StringIO()
   with patch.object(eng,"CANONICAL_SHA256",sha),patch("sys.argv",
      ["probe","--canonical-docx",str(file),"--verify-source-only"]),contextlib.redirect_stdout(buf):
    eng.main()
   res=json.loads(buf.getvalue())
   self.assertEqual(res["status"],"VERIFIED_PRIVATE_SOURCE_ONLY")
   self.assertNotIn("Exact synthetic paragraph",buf.getvalue())
 def test_private_output_file_has_mode_0600(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);doc=root/"synthetic.docx";sha=fixture.fake_source(doc)
   task=root/"task.json";task.write_text(json.dumps(fixture.task()),encoding="utf8")
   priv=root/"private";priv.mkdir(mode=0o700);output=priv/"packet.json"
   with patch.object(eng,"CANONICAL_SHA256",sha),patch("sys.argv",
     ["probe","--canonical-docx",str(doc),"--task-json",str(task),"--out",str(output)]),patch("builtins.print"):
    eng.main()
   self.assertEqual(stat.S_IMODE(output.stat().st_mode),0o600)
 def test_shared_directory_is_denied(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);doc=root/"synthetic.docx";sha=fixture.fake_source(doc)
   task=root/"task.json";task.write_text(json.dumps(fixture.task()),encoding="utf8")
   shared=root/"shared";shared.mkdir(mode=0o755)
   with patch.object(eng,"CANONICAL_SHA256",sha),patch("sys.argv",
     ["probe","--canonical-docx",str(doc),"--task-json",str(task),"--out",str(shared/"packet.json")]):
    with self.assertRaisesRegex(ValueError,"UNSAFE_PRIVATE_OUTPUT_DIRECTORY"):
     eng.main()
if __name__=="__main__":unittest.main(verbosity=2)
