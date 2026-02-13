
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  Settings as SettingsIcon, 
  Play, 
  Square, 
  Monitor, 
  HardDrive, 
  Cpu, 
  Network, 
  Usb, 
  Folder, 
  Info,
  ChevronRight,
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  List,
  FileText,
  Camera,
  Layers,
  Disc,
  Activity,
  Zap,
  Clock,
  Layout,
  Search,
  Wifi,
  Volume2,
  Battery
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
type VMStatus = 'Powered Off' | 'Running' | 'Saved' | 'Aborted';
type ActiveTab = 'Details' | 'Snapshots' | 'Logs';

interface Snapshot {
  id: string;
  name: string;
  timestamp: string;
  terminalHistory: { role: string; content: string }[];
}

interface VirtualMachine {
  id: string;
  name: string;
  osType: 'Linux' | 'Windows' | 'Oracle Solaris' | 'Other';
  osVersion: string;
  status: VMStatus;
  memory: number; 
  processors: number;
  vram: number; 
  storage: number; 
  icon: 'linux' | 'windows' | 'kali' | 'other';
  logs: string[];
  snapshots: Snapshot[];
}

// --- Initial Data ---
const INITIAL_VMS: VirtualMachine[] = [
  { 
    id: '1', name: 'Ubuntu 22.04 LTS', osType: 'Linux', osVersion: 'Ubuntu (64-bit)', 
    status: 'Powered Off', memory: 4096, processors: 2, vram: 128, storage: 25, 
    icon: 'linux', logs: ['[0.00] System initialized', '[0.05] BIOS version 2.4.1'],
    snapshots: []
  },
  { 
    id: '2', name: 'Windows 11 Pro', osType: 'Windows', osVersion: 'Windows 11 (64-bit)', 
    status: 'Powered Off', memory: 8192, processors: 4, vram: 256, storage: 80, 
    icon: 'windows', logs: ['[0.00] Windows Boot Manager active'],
    snapshots: []
  },
];

const VirtualBoxApp: React.FC = () => {
  const [vms, setVms] = useState<VirtualMachine[]>(INITIAL_VMS);
  const [selectedVmId, setSelectedVmId] = useState<string>(INITIAL_VMS[0].id);
  const [activeTab, setActiveTab] = useState<ActiveTab>('Details');
  
  // Modals
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings Temporary State
  const [tempSettings, setTempSettings] = useState<VirtualMachine | null>(null);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState<string[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<{role: string, content: string}[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [diskActivity, setDiskActivity] = useState(false);
  const [showWinCmd, setShowWinCmd] = useState(false); // For Windows GUI Command Prompt
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVm = vms.find(v => v.id === selectedVmId) || vms[0];

  useEffect(() => {
    if (isRunning) terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory, isRunning, showWinCmd]);

  // --- Actions ---
  const handleStart = () => {
    if (selectedVm.status === 'Running') return;
    setIsBooting(true);
    setBootProgress([]);
    setShowWinCmd(false);
    
    const linuxBoot = [
      "VirtualBox VM 7.0.12 r159484",
      "Copyright (C) 2024 Oracle Corporation",
      `Memory: ${selectedVm.memory}MB System RAM`,
      "BIOS: VirtualBox 01/15/2024",
      "CPU: Virtual Quad-Core i7-12700K",
      "SATA controller 0 at 0x1f0, 0x3f4 irq 14",
      "Booting from Hard Disk...",
      "Welcome to GRUB!",
      "[    0.000000] Linux version 5.15.0-generic",
      "[    1.234567] systemd[1]: Reached target Graphical Interface."
    ];

    const windowsBoot = [
      "Oracle VM VirtualBox",
      "EFI Shell version 2.70 [5.11]",
      "Current running mode 1.1.2",
      "Device mapping table",
      "  fs0  :HardDisk - Alias hd7a6121b blk0",
      "Press ESC in 1 seconds to skip startup.nsh or any other key to continue.",
      "Booting Windows Boot Manager...",
      " "
    ];

    const steps = selectedVm.osType === 'Windows' ? windowsBoot : linuxBoot;

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setBootProgress(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsBooting(false);
          setIsRunning(true);
          updateVmStatus(selectedVm.id, 'Running');
          
          if (selectedVm.osType === 'Windows') {
            setTerminalHistory([{ 
              role: 'system', 
              content: `Microsoft Windows [Version 10.0.22621.2428]\n(c) Microsoft Corporation. All rights reserved.\n\nC:\\Users\\Admin>` 
            }]);
          } else {
            setTerminalHistory([{ 
              role: 'system', 
              content: `Ubuntu 22.04.3 LTS ${selectedVm.name} tty1\n\n${selectedVm.name} login: user\nPassword: \nLast login: ${new Date().toLocaleString()}\nuser@${selectedVm.name.toLowerCase().replace(/\s/g, '')}:~$ ` 
            }]);
          }
        }, selectedVm.osType === 'Windows' ? 2000 : 1000);
      }
    }, 200);
  };

  const handleStop = () => {
    setIsRunning(false);
    updateVmStatus(selectedVm.id, 'Powered Off');
    setTerminalHistory([]);
    setShowWinCmd(false);
  };

  const updateVmStatus = (id: string, status: VMStatus) => {
    setVms(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  const createNewVm = (name: string, osType: string, memory: number) => {
    const type = (osType === 'Microsoft Windows' ? 'Windows' : osType) as VirtualMachine['osType'];
    const newVm: VirtualMachine = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || 'New Machine',
      osType: type,
      osVersion: `${osType} (64-bit)`,
      status: 'Powered Off',
      memory,
      processors: 2,
      vram: 128,
      storage: 20,
      icon: type === 'Linux' ? 'linux' : (type === 'Windows' ? 'windows' : 'other'),
      logs: [`[${new Date().toISOString()}] Created ${name}`],
      snapshots: []
    };
    setVms([...vms, newVm]);
    setSelectedVmId(newVm.id);
    setShowNewWizard(false);
  };

  const saveSettings = () => {
    if (tempSettings) {
      setVms(vms.map(v => v.id === selectedVmId ? { ...tempSettings } : v));
      setShowSettings(false);
    }
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setDiskActivity(true);
    setTerminalHistory(prev => [...prev, { role: 'user', content: cmd }]);
    setCurrentInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = terminalHistory.map(h => h.content).join('\n');
      
      const prompt = selectedVm.osType === 'Windows' 
        ? `You are a Windows Command Prompt (CMD.exe). Current directory: C:\\Users\\Admin. User command: "${cmd}".`
        : `You are a Linux Bash terminal. Current directory: /home/user. User command: "${cmd}".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${prompt}\nHistory:\n${context.slice(-800)}\nRules: ONLY return shell output. No backticks. No talk. If command is "cls" or "clear", return exactly "[CLEAR]".`,
      });

      let output = response.text || (selectedVm.osType === 'Windows' ? "'cmd' is not recognized" : "bash: command not found");
      
      if (output.includes("[CLEAR]")) {
        setTerminalHistory([]);
      } else {
        setTerminalHistory(prev => [...prev, { role: 'assistant', content: output }]);
      }
    } catch (e) {
      setTerminalHistory(prev => [...prev, { role: 'error', content: "System error: IO exception" }]);
    } finally {
      setTimeout(() => setDiskActivity(false), 300);
    }
  };

  const takeSnapshot = () => {
    if (!isRunning) return;
    const newSnapshot: Snapshot = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Snapshot ${selectedVm.snapshots.length + 1}`,
      timestamp: new Date().toLocaleString(),
      terminalHistory: [...terminalHistory]
    };
    setVms(prev => prev.map(v => v.id === selectedVmId ? { ...v, snapshots: [...v.snapshots, newSnapshot] } : v));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f0f0f0] text-sm font-sans select-none overflow-hidden text-gray-800">
      {/* Menu Bar */}
      <div className="flex bg-white border-b border-[#cccccc] px-2 py-0.5 text-[11px] h-6 items-center shadow-sm">
        {['File', 'Machine', 'View', 'Input', 'Devices', 'Help'].map(item => (
          <div key={item} className="px-3 py-0.5 hover:bg-[#e5f1fb] cursor-default border border-transparent hover:border-[#b8d6fb] rounded transition-all">{item}</div>
        ))}
      </div>

      {/* Main Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-[#fcfcfc] border-b border-[#cccccc] h-14 shadow-sm z-10">
        <ToolButton icon={<Plus size={22} className="text-[#0078d7]" />} label="New" onClick={() => setShowNewWizard(true)} disabled={isRunning} />
        <ToolButton icon={<SettingsIcon size={22} className="text-[#f5821f]" />} label="Settings" onClick={() => { setTempSettings({...selectedVm}); setShowSettings(true); }} disabled={isRunning} />
        <div className="w-[1px] h-8 bg-[#dddddd] mx-2" />
        <ToolButton 
          icon={<Play size={22} className="text-[#39b54a]" />} 
          label="Start" 
          onClick={handleStart} 
          disabled={isRunning || isBooting || selectedVm.status === 'Running'} 
        />
        <ToolButton 
          icon={<Square size={20} className="text-[#ec1c24]" />} 
          label="Stop" 
          onClick={handleStop} 
          disabled={!isRunning} 
        />
        <div className="w-[1px] h-8 bg-[#dddddd] mx-2" />
        <ToolButton icon={<Camera size={20} className="text-[#0078d7] opacity-80" />} label="Snapshot" onClick={takeSnapshot} disabled={!isRunning} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Machine List */}
        <div className="w-72 bg-[#fcfcfc] border-r border-[#cccccc] flex flex-col overflow-y-auto">
          {vms.map(vm => (
            <div 
              key={vm.id}
              onClick={() => !isRunning && setSelectedVmId(vm.id)}
              className={`flex items-center gap-3 p-3 cursor-default border-b border-[#f5f5f5] transition-all relative ${selectedVmId === vm.id ? 'bg-[#0078d7] text-white' : 'hover:bg-[#e8f2fa]'}`}
            >
              <div className={`p-2 rounded shadow-sm ${selectedVmId === vm.id ? 'bg-white bg-opacity-30' : 'bg-gray-100'}`}>
                <Monitor size={24} className={selectedVmId === vm.id ? 'text-white' : 'text-gray-600'} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate text-[13px]">{vm.name}</span>
                <div className="flex items-center gap-1.5">
                   <div className={`w-2 h-2 rounded-full ${vm.status === 'Running' ? 'bg-[#39b54a] shadow-[0_0_4px_#39b54a]' : vm.status === 'Saved' ? 'bg-orange-400' : 'bg-gray-400'}`} />
                   <span className={`text-[10px] font-bold tracking-tight opacity-70 ${selectedVmId === vm.id ? 'text-blue-100' : 'text-gray-500'}`}>{vm.status}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-auto p-4 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Oracle VM VirtualBox Manager</div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 bg-white relative overflow-hidden flex flex-col shadow-2xl">
          {isRunning ? (
            /* Running VM View */
            <div className="flex flex-col h-full bg-[#1c1c1c] text-white">
               {/* Console Title Bar */}
               <div className="bg-[#323232] px-3 py-1 flex justify-between items-center text-[11px] border-b border-black">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-blue-400" />
                    <span className="font-bold tracking-wide">{selectedVm.name} [Running] - Oracle VM VirtualBox</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Maximize2 size={12} className="cursor-pointer hover:text-blue-400" />
                    <X size={16} className="cursor-pointer hover:text-red-500 bg-red-500 bg-opacity-10 rounded px-1" onClick={handleStop} />
                  </div>
               </div>

               {selectedVm.osType === 'Windows' ? (
                 /* Windows 11 GUI Mode */
                 <div className="flex-1 relative bg-cover bg-center overflow-hidden" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop)' }}>
                    {/* Desktop Icons */}
                    <div className="p-4 flex flex-col gap-6">
                       <div className="flex flex-col items-center gap-1 w-20 group cursor-default" onDoubleClick={() => setShowWinCmd(true)}>
                          <div className="p-3 bg-gray-800 bg-opacity-40 rounded group-hover:bg-opacity-60 transition-all backdrop-blur-md">
                             <TerminalIcon size={24} className="text-white" />
                          </div>
                          <span className="text-[10px] font-medium drop-shadow-md text-center">Command Prompt</span>
                       </div>
                    </div>

                    {/* Window Management */}
                    {showWinCmd && (
                      <div className="absolute top-20 left-40 w-[600px] h-[400px] bg-black border border-gray-600 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-150">
                        <div className="bg-[#1e1e1e] p-2 flex justify-between items-center border-b border-gray-800">
                          <div className="flex items-center gap-2 px-2">
                            <TerminalIcon size={12} className="text-gray-400" />
                            <span className="text-[11px] text-gray-300">Command Prompt</span>
                          </div>
                          <div className="flex gap-4 px-2">
                             <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setShowWinCmd(false)} />
                          </div>
                        </div>
                        <div className="flex-1 p-3 font-mono text-[13px] overflow-y-auto" onClick={() => inputRef.current?.focus()}>
                           {terminalHistory.map((h, i) => (
                             <div key={i} className={`mb-1 whitespace-pre-wrap ${h.role === 'error' ? 'text-red-400' : 'text-gray-300'}`}>{h.content}</div>
                           ))}
                           <div className="flex items-center gap-2">
                             <input 
                               ref={inputRef}
                               className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                               value={currentInput}
                               onChange={e => setCurrentInput(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && executeCommand(currentInput)}
                               autoFocus
                             />
                           </div>
                           <div ref={terminalEndRef} />
                        </div>
                      </div>
                    )}

                    {/* Taskbar */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900 bg-opacity-40 backdrop-blur-xl border-t border-white border-opacity-10 flex items-center justify-center px-4">
                       <div className="flex items-center gap-1">
                          <div className="p-2 hover:bg-white hover:bg-opacity-10 rounded transition-all"><Layout size={20} className="text-blue-400" /></div>
                          <div className="p-2 hover:bg-white hover:bg-opacity-10 rounded transition-all" onClick={() => setShowWinCmd(true)}><TerminalIcon size={20} className="text-gray-300" /></div>
                          <div className="p-2 hover:bg-white hover:bg-opacity-10 rounded transition-all"><Search size={20} className="text-gray-300" /></div>
                       </div>
                       <div className="absolute right-4 flex items-center gap-4 text-white text-[11px] font-medium">
                          <div className="flex items-center gap-2 opacity-80">
                            <Wifi size={14} />
                            <Volume2 size={14} />
                            <Battery size={14} />
                          </div>
                          <div className="flex flex-col items-end">
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[9px] opacity-60">{new Date().toLocaleDateString()}</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ) : (
                 /* Linux Terminal Mode */
                 <div className="flex-1 p-4 font-mono text-[14px] bg-black overflow-y-auto" onClick={() => inputRef.current?.focus()}>
                    {terminalHistory.map((h, i) => (
                      <div key={i} className={`mb-1 whitespace-pre-wrap ${h.role === 'error' ? 'text-red-500' : h.role === 'user' ? 'text-blue-300' : 'text-green-400'}`}>{h.content}</div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input 
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                        value={currentInput}
                        onChange={e => setCurrentInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && executeCommand(currentInput)}
                        autoFocus
                      />
                    </div>
                    <div ref={terminalEndRef} />
                 </div>
               )}

               {/* Console Status Bar */}
               <div className="bg-[#2b2b2b] h-7 flex items-center justify-end px-4 gap-4 border-t border-black text-gray-500">
                  <div className="flex items-center gap-1.5 px-2 rounded-sm hover:bg-white hover:bg-opacity-5 transition-all">
                    <HardDrive size={13} className={diskActivity ? "text-red-500 animate-pulse" : "text-gray-600"} />
                    <span className="text-[9px] font-bold">SSD0</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Network size={13} className="text-blue-500" />
                    <span className="text-[9px] font-bold">ETH0</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Disc size={13} />
                    <span className="text-[9px] font-bold">CD0</span>
                  </div>
               </div>
            </div>
          ) : isBooting ? (
            /* Boot Sequence */
            <div className="flex-1 flex flex-col bg-black text-white font-mono p-12 text-sm leading-relaxed">
               {selectedVm.osType === 'Windows' && <div className="text-4xl font-bold mb-8 opacity-40 text-center py-20">TianoCore</div>}
               <div className="flex-1">
                 {bootProgress.map((line, i) => <div key={i} className="mb-0.5">{line}</div>)}
                 <div className="inline-block w-2 h-4 bg-white animate-pulse mt-2" />
               </div>
               <div className="mt-auto flex justify-between text-gray-600 text-[10px] border-t border-gray-900 pt-4 uppercase">
                  <span>Press F12 for Boot Menu</span>
                  <span>Esc for EFI Setup</span>
               </div>
            </div>
          ) : (
            /* Manager Dashboard View */
            <>
              <div className="flex bg-[#f0f0f0] border-b border-[#cccccc] px-1 pt-1 h-9">
                <TabButton active={activeTab === 'Details'} onClick={() => setActiveTab('Details')} label="Details" icon={<List size={14} />} />
                <TabButton active={activeTab === 'Snapshots'} onClick={() => setActiveTab('Snapshots')} label="Snapshots" icon={<Camera size={14} />} />
                <TabButton active={activeTab === 'Logs'} onClick={() => setActiveTab('Logs')} label="Logs" icon={<FileText size={14} />} />
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
                {activeTab === 'Details' && (
                  <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center gap-8 border-b border-gray-100 pb-8">
                       <div className="p-6 bg-white rounded-2xl shadow-xl border border-gray-50 transform -rotate-1 hover:rotate-0 transition-transform">
                          <Monitor size={64} className="text-[#0078d7]" />
                       </div>
                       <div>
                          <h1 className="text-4xl font-light text-gray-900 tracking-tight">{selectedVm.name}</h1>
                          <p className="text-[#0078d7] mt-1 font-bold uppercase text-[10px] tracking-widest">{selectedVm.osVersion} / {selectedVm.status}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <ConfigSection title="General" icon={<Layers size={16} />}>
                        <DataRow label="Machine Name" value={selectedVm.name} />
                        <DataRow label="OS Family" value={selectedVm.osType} />
                        <DataRow label="Encryption" value="None" />
                        <DataRow label="System BIOS" value="UEFI v2.8" />
                      </ConfigSection>

                      <ConfigSection title="System" icon={<Cpu size={16} />}>
                        <DataRow label="Memory" value={`${selectedVm.memory} MB`} />
                        <DataRow label="CPU Cores" value={`${selectedVm.processors} vCPUs`} />
                        <DataRow label="Chipset" value="ICH9" />
                        <DataRow label="TPM 2.0" value="Enabled" />
                      </ConfigSection>

                      <ConfigSection title="Display" icon={<Monitor size={16} />}>
                        <DataRow label="Video RAM" value={`${selectedVm.vram} MB`} />
                        <DataRow label="Controller" value="VBoxSVGA" />
                        <DataRow label="Remote Server" value="Disabled" />
                      </ConfigSection>

                      <ConfigSection title="Storage" icon={<HardDrive size={16} />}>
                        <DataRow label="Type" value="VDI (Virtual Disk)" />
                        <DataRow label="Disk Path" value={`/vms/${selectedVm.id}/disk.vdi`} />
                        <DataRow label="SATA AHCI" value="Active" />
                      </ConfigSection>

                      <ConfigSection title="Network" icon={<Network size={16} />}>
                        <DataRow label="Adapter" value="Intel(R) 82540EM (NAT)" />
                        <DataRow label="Link Speed" value="1 Gbps" />
                      </ConfigSection>
                    </div>
                  </div>
                )}

                {activeTab === 'Snapshots' && (
                  <div className="max-w-4xl mx-auto flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-light">Snapshot Management</h2>
                       <button onClick={takeSnapshot} className="px-4 py-1.5 bg-[#0078d7] text-white rounded text-xs font-bold hover:shadow-lg transition-all active:scale-95">Take Snapshot</button>
                    </div>
                    {selectedVm.snapshots.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed rounded-3xl py-32 bg-gray-50 bg-opacity-50">
                        <Camera size={80} strokeWidth={0.5} />
                        <p className="text-sm font-medium">Capture the machine's current state to return to later.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedVm.snapshots.map(s => (
                          <div key={s.id} className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm flex justify-between items-center group hover:border-[#0078d7] transition-all">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-[#f0f7ff] rounded-lg text-[#0078d7]"><Clock size={18} /></div>
                                <div>
                                   <div className="font-bold text-gray-800">{s.name}</div>
                                   <div className="text-[10px] text-gray-400 font-mono tracking-widest">{s.timestamp}</div>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-[#0078d7] transition-all uppercase">Clone</button>
                                <button className="opacity-0 group-hover:opacity-100 px-4 py-1.5 bg-[#0078d7] text-white rounded-lg text-[10px] font-bold hover:shadow-md transition-all uppercase">Restore</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Logs' && (
                  <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl flex flex-col h-full border border-black">
                     <div className="bg-[#333] px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-black">VBox.log - Runtime Diagnostics</div>
                     <div className="p-6 font-mono text-[11px] text-gray-400 overflow-y-auto leading-relaxed">
                        {selectedVm.logs.map((log, i) => (
                          <div key={i} className="mb-1 border-b border-white border-opacity-5 pb-1 hover:text-white transition-colors">
                             <span className="text-gray-600 mr-4 select-none">{String(i).padStart(4, '0')}</span>
                             {log}
                          </div>
                        ))}
                        <div className="text-green-900 italic mt-6">--- End of log stream ---</div>
                     </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {showNewWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden border border-[#ccc]">
             <div className="bg-[#f0f0f0] p-4 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700">Create New Virtual Machine</span>
                <X size={20} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setShowNewWizard(false)} />
             </div>
             <form onSubmit={(e) => {
               e.preventDefault();
               const form = e.target as HTMLFormElement;
               createNewVm(form.vmname.value, form.ostype.value, parseInt(form.memory.value));
             }} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                  <input name="vmname" required className="w-full border-b-2 border-gray-200 py-2 focus:border-[#0078d7] outline-none text-xl transition-all" placeholder="Ubuntu Desktop" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                    <select name="ostype" className="w-full border p-2 rounded focus:ring-2 focus:ring-[#0078d7] outline-none bg-gray-50 font-bold text-xs">
                      <option>Linux</option>
                      <option>Microsoft Windows</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RAM (MB)</label>
                    <input name="memory" type="number" defaultValue={4096} className="w-full border p-2 rounded focus:ring-2 focus:ring-[#0078d7] outline-none bg-gray-50 font-bold text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-10">
                  <button type="button" onClick={() => setShowNewWizard(false)} className="px-6 py-2 text-xs font-bold text-gray-400 hover:bg-gray-100 rounded-lg uppercase">Cancel</button>
                  <button type="submit" className="px-10 py-2 bg-[#0078d7] text-white rounded-lg font-bold shadow-lg hover:bg-[#006cc1] transition-all uppercase text-xs">Create</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showSettings && tempSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] h-[450px] overflow-hidden border border-[#ccc] flex flex-col">
             <div className="bg-[#f0f0f0] p-4 border-b flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                   <SettingsIcon size={18} className="text-[#f5821f]" />
                   <span className="font-bold text-gray-700">{tempSettings.name} - Settings</span>
                </div>
                <X size={20} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setShowSettings(false)} />
             </div>
             <div className="flex flex-1">
                <div className="w-32 bg-[#f9f9f9] border-r p-3 space-y-1">
                   {['General', 'System', 'Display', 'Storage', 'Network'].map(s => (
                     <div key={s} className={`p-2 rounded text-[11px] font-bold uppercase tracking-tight cursor-default ${s === 'General' ? 'bg-[#e5f1fb] text-[#0078d7]' : 'hover:bg-gray-200 text-gray-500'}`}>{s}</div>
                   ))}
                </div>
                <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Machine Name</label>
                      <input 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#0078d7] outline-none" 
                        value={tempSettings.name} 
                        onChange={e => setTempSettings({...tempSettings, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Memory (MB)</label>
                      <input 
                        type="range" min="512" max="16384" step="512" 
                        className="w-full accent-[#0078d7]" 
                        value={tempSettings.memory}
                        onChange={e => setTempSettings({...tempSettings, memory: parseInt(e.target.value)})}
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                        <span>512 MB</span>
                        <span className="text-[#0078d7] bg-[#eef7ff] px-2 py-0.5 rounded border border-[#cce5ff]">{tempSettings.memory} MB</span>
                        <span>16 GB</span>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">vCPUs</label>
                      <input 
                        type="number" min="1" max="16" 
                        className="w-full border p-2 rounded"
                        value={tempSettings.processors}
                        onChange={e => setTempSettings({...tempSettings, processors: parseInt(e.target.value)})}
                      />
                   </div>
                </div>
             </div>
             <div className="p-4 bg-[#f0f0f0] border-t flex justify-end gap-3">
                <button onClick={() => setShowSettings(false)} className="px-6 py-1.5 text-xs font-bold text-gray-500 hover:bg-white rounded border">Cancel</button>
                <button onClick={saveSettings} className="px-8 py-1.5 bg-[#0078d7] text-white rounded font-bold shadow-md text-xs uppercase">Save</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #999; }
        
        .animate-in { animation: animateIn 0.2s ease-out; }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px white inset !important; }
      `}</style>
    </div>
  );
};

// --- Subcomponents ---

const ToolButton: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, disabled?: boolean }> = ({ icon, label, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg transition-all group
      ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[#f0f7ff] active:bg-[#e1effe] active:scale-95'}`}
  >
    <div className="mb-0.5 group-hover:scale-110 transition-transform">{icon}</div>
    <span className={`text-[9px] font-bold uppercase tracking-tighter ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>{label}</span>
  </button>
);

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2
      ${active ? 'bg-white border-[#0078d7] text-[#0078d7] shadow-[0_4px_10px_rgba(0,120,215,0.1)]' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
  >
    {icon}
    {label}
  </button>
);

const ConfigSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 border-opacity-60">
    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-3 font-bold text-[9px] text-gray-400 uppercase tracking-widest">
      <div className="p-1.5 bg-white rounded-lg shadow-sm text-[#0078d7] group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span>{title}</span>
    </div>
    <div className="p-5 space-y-3 bg-gradient-to-br from-white to-[#fafafa]">
      {children}
    </div>
  </div>
);

const DataRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-[11px] border-b border-gray-50 border-opacity-50 pb-2 last:border-0 last:pb-0 group/row">
    <span className="text-gray-400 font-medium uppercase text-[9px] tracking-tight group-hover/row:text-[#0078d7] transition-colors">{label}</span>
    <span className="text-gray-700 font-bold bg-gray-100 bg-opacity-40 px-2 py-0.5 rounded-md">{value}</span>
  </div>
);

// --- Entry Point ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<VirtualBoxApp />);
}
