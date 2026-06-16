Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node """ & WshShell.CurrentDirectory & "\autopilot.js""", 0, True
