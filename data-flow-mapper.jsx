import { useState, useCallback, useRef, useEffect } from "react";

const SYSTEMS = [
  { id: "creator", label: "Zoho Creator", color: "#E8443A", icon: "⚡" },
  { id: "crm", label: "Zoho CRM", color: "#2B6CB0", icon: "🏢" },
  { id: "make", label: "Make", color: "#6B21A8", icon: "⚙️" },
  { id: "notion", label: "Notion", color: "#191919", icon: "📓" },
  { id: "gdrive", label: "Google Drive", color: "#0F9D58", icon: "📁" },
  { id: "sheets", label: "Google Sheets", color: "#0F9D58", icon: "📊" },
  { id: "other", label: "Other", color: "#71717A", icon: "🔗" },
];

const FIELD_TYPES = ["Text", "Number", "Date", "Lookup", "Email", "Phone", "URL", "File", "Boolean", "Picklist", "Multi-Select", "Subform", "ID/Key"];

const INITIAL_NODES = [
  {
    id: "n1",
    system: "creator",
    name: "Confirm Home Assessment",
    app: "confirmhomeassessment",
    fields: [
      { id: "f1", name: "Client_Name", type: "Text", critical: true },
      { id: "f2", name: "Assessment_Date", type: "Date", critical: false },
      { id: "f3", name: "Address", type: "Text", critical: true },
      { id: "f4", name: "Status", type: "Picklist", critical: true },
    ],
  },
];

const INITIAL_CONNECTIONS = [];

function generateId() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}

// ─── Tiny modal ───
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1E", borderRadius: 14, padding: "28px 30px",
          width: "min(440px, 92vw)", maxHeight: "85vh", overflowY: "auto",
          border: "1px solid #333", boxShadow: "0 20px 60px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#F4F4F5", fontSize: 17, fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      background: color + "22", color: color, fontSize: 11, fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".3px",
    }}>
      {children}
    </span>
  );
}

function FieldRow({ field, systemColor, onToggleCritical, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
      borderBottom: "1px solid #2A2A2E",
    }}>
      <button
        onClick={onToggleCritical}
        title={field.critical ? "Critical field — click to unmark" : "Click to mark as critical"}
        style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 13,
          filter: field.critical ? "none" : "grayscale(1) opacity(.4)",
        }}
      >🔴</button>
      <span style={{ flex: 1, color: "#E4E4E7", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
        {field.name}
      </span>
      <Badge color={systemColor}>{field.type}</Badge>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕</button>
    </div>
  );
}

// ─── Main App ───
export default function DataFlowMapper() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [addConnOpen, setAddConnOpen] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [impactField, setImpactField] = useState(null);
  const [editNodeId, setEditNodeId] = useState(null);

  // New node form
  const [newSystem, setNewSystem] = useState("crm");
  const [newName, setNewName] = useState("");
  const [newApp, setNewApp] = useState("");

  // New connection form
  const [connFrom, setConnFrom] = useState({ node: "", field: "" });
  const [connTo, setConnTo] = useState({ node: "", field: "" });
  const [connVia, setConnVia] = useState("");
  const [connDirection, setConnDirection] = useState("one-way");

  // New field form
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("Text");

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #333", background: "#111114", color: "#E4E4E7",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
    boxSizing: "border-box",
  };

  const btnPrimary = {
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: "#E8443A", color: "#fff", fontSize: 13,
    fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  };

  const btnGhost = {
    padding: "10px 20px", borderRadius: 8,
    border: "1px solid #333", background: "transparent", color: "#A1A1AA",
    fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle = {
    display: "block", marginBottom: 4, color: "#888", fontSize: 11,
    fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase",
    fontFamily: "'DM Sans', sans-serif",
  };

  // ─── Handlers ───
  const addNode = () => {
    if (!newName.trim()) return;
    setNodes((prev) => [...prev, {
      id: generateId(), system: newSystem, name: newName.trim(),
      app: newApp.trim(), fields: [],
    }]);
    setNewName(""); setNewApp(""); setAddNodeOpen(false);
  };

  const deleteNode = (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const addField = (nodeId) => {
    if (!newFieldName.trim()) return;
    setNodes((prev) => prev.map((n) =>
      n.id === nodeId
        ? { ...n, fields: [...n.fields, { id: generateId(), name: newFieldName.trim(), type: newFieldType, critical: false }] }
        : n
    ));
    setNewFieldName(""); setNewFieldType("Text");
  };

  const toggleCritical = (nodeId, fieldId) => {
    setNodes((prev) => prev.map((n) =>
      n.id === nodeId
        ? { ...n, fields: n.fields.map((f) => f.id === fieldId ? { ...f, critical: !f.critical } : f) }
        : n
    ));
  };

  const deleteField = (nodeId, fieldId) => {
    setNodes((prev) => prev.map((n) =>
      n.id === nodeId ? { ...n, fields: n.fields.filter((f) => f.id !== fieldId) } : n
    ));
    setConnections((prev) => prev.filter((c) =>
      !(c.fromNode === nodeId && c.fromField === fieldId) &&
      !(c.toNode === nodeId && c.toField === fieldId)
    ));
  };

  const addConnection = () => {
    if (!connFrom.node || !connFrom.field || !connTo.node || !connTo.field) return;
    const newConn = {
      id: generateId(),
      fromNode: connFrom.node, fromField: connFrom.field,
      toNode: connTo.node, toField: connTo.field,
      via: connVia.trim(), direction: connDirection,
    };
    setConnections((prev) => [...prev, newConn]);
    if (connDirection === "two-way") {
      setConnections((prev) => [...prev, {
        id: generateId(),
        fromNode: connTo.node, fromField: connTo.field,
        toNode: connFrom.node, toField: connFrom.field,
        via: connVia.trim(), direction: "two-way-reverse",
      }]);
    }
    setConnFrom({ node: "", field: "" }); setConnTo({ node: "", field: "" });
    setConnVia(""); setAddConnOpen(false);
  };

  const deleteConnection = (connId) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  // ─── Impact analysis ───
  const analyzeImpact = (nodeId, fieldId) => {
    const node = nodes.find((n) => n.id === nodeId);
    const field = node?.fields.find((f) => f.id === fieldId);
    if (!node || !field) return;
    setImpactField({ node, field });
    setImpactOpen(true);
  };

  const getDownstream = (nodeId, fieldId, visited = new Set()) => {
    const key = `${nodeId}:${fieldId}`;
    if (visited.has(key)) return [];
    visited.add(key);
    const direct = connections.filter((c) => c.fromNode === nodeId && c.fromField === fieldId);
    let results = [];
    for (const conn of direct) {
      const targetNode = nodes.find((n) => n.id === conn.toNode);
      const targetField = targetNode?.fields.find((f) => f.id === conn.toField);
      if (targetNode && targetField) {
        results.push({ node: targetNode, field: targetField, via: conn.via });
        results = results.concat(getDownstream(conn.toNode, conn.toField, visited));
      }
    }
    return results;
  };

  const getUpstream = (nodeId, fieldId, visited = new Set()) => {
    const key = `${nodeId}:${fieldId}`;
    if (visited.has(key)) return [];
    visited.add(key);
    const direct = connections.filter((c) => c.toNode === nodeId && c.toField === fieldId);
    let results = [];
    for (const conn of direct) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNode);
      const sourceField = sourceNode?.fields.find((f) => f.id === conn.fromField);
      if (sourceNode && sourceField) {
        results.push({ node: sourceNode, field: sourceField, via: conn.via });
        results = results.concat(getUpstream(conn.fromNode, conn.fromField, visited));
      }
    }
    return results;
  };

  const sys = (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[6];

  // ─── Storage ───
  useEffect(() => {
    (async () => {
      try {
        const nd = await window.storage.get("mapper-nodes");
        const cn = await window.storage.get("mapper-connections");
        if (nd?.value) setNodes(JSON.parse(nd.value));
        if (cn?.value) setConnections(JSON.parse(cn.value));
      } catch (e) { /* first load */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await window.storage.set("mapper-nodes", JSON.stringify(nodes));
        await window.storage.set("mapper-connections", JSON.stringify(connections));
      } catch (e) { /* silent */ }
    })();
  }, [nodes, connections]);

  const resetAll = async () => {
    if (!confirm("Reset all data? This cannot be undone.")) return;
    setNodes(INITIAL_NODES);
    setConnections(INITIAL_CONNECTIONS);
    setSelectedNode(null);
    try {
      await window.storage.delete("mapper-nodes");
      await window.storage.delete("mapper-connections");
    } catch (e) {}
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0E0E10", color: "#E4E4E7",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid #1E1E22",
        background: "linear-gradient(180deg, #141416 0%, #0E0E10 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 20, fontWeight: 700,
              background: "linear-gradient(135deg, #E8443A, #F59E0B)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-.3px",
            }}>
              Data Flow Mapper
            </h1>
            <p style={{ margin: "4px 0 0", color: "#71717A", fontSize: 12 }}>
              Map dependencies across Zoho Creator → CRM → Make → Notion → Drive
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setAddNodeOpen(true)} style={btnPrimary}>+ System / Module</button>
            <button onClick={() => setAddConnOpen(true)} style={btnGhost}>+ Connection</button>
            <button onClick={resetAll} style={{ ...btnGhost, color: "#EF4444", borderColor: "#7F1D1D" }}>Reset</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          {SYSTEMS.map((s) => (
            <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Node cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16, padding: "20px 24px",
        }}>
          {nodes.map((node) => {
            const s = sys(node.system);
            const nodeConns = connections.filter((c) => c.fromNode === node.id || c.toNode === node.id);
            const isSelected = selectedNode === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{
                  background: isSelected ? "#1A1A1E" : "#141416",
                  border: `1px solid ${isSelected ? s.color + "66" : "#1E1E22"}`,
                  borderRadius: 12, padding: 0, cursor: "pointer",
                  transition: "border-color .2s, box-shadow .2s",
                  boxShadow: isSelected ? `0 0 20px ${s.color}18` : "none",
                }}
              >
                {/* Card header */}
                <div style={{
                  padding: "14px 16px 10px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", borderBottom: "1px solid #1E1E22",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: s.color + "18", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>
                      {s.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#F4F4F5" }}>{node.name}</div>
                      <div style={{ fontSize: 11, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.label}{node.app ? ` · ${node.app}` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditNodeId(node.id); }}
                      style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}
                      title="Edit fields"
                    >✏️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13 }}
                      title="Delete"
                    >🗑</button>
                  </div>
                </div>

                {/* Fields */}
                <div style={{ padding: "8px 16px 12px" }}>
                  {node.fields.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 12, padding: "8px 0", fontStyle: "italic" }}>No fields yet — click ✏️ to add</div>
                  ) : (
                    node.fields.map((f) => (
                      <div
                        key={f.id}
                        onClick={(e) => { e.stopPropagation(); analyzeImpact(node.id, f.id); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "4px 0", fontSize: 12, cursor: "pointer",
                          borderBottom: "1px solid #1A1A1E",
                        }}
                        title="Click to analyze impact"
                      >
                        {f.critical && <span style={{ color: "#EF4444", fontSize: 9 }}>●</span>}
                        <span style={{ flex: 1, color: "#D4D4D8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {f.name}
                        </span>
                        <Badge color={s.color}>{f.type}</Badge>
                        {nodeConns.some((c) =>
                          (c.fromNode === node.id && c.fromField === f.id) ||
                          (c.toNode === node.id && c.toField === f.id)
                        ) && <span style={{ fontSize: 10 }} title="Has connections">🔗</span>}
                      </div>
                    ))
                  )}
                </div>

                {/* Connection count */}
                <div style={{
                  padding: "8px 16px", borderTop: "1px solid #1E1E22",
                  display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666",
                }}>
                  <span>{node.fields.length} fields</span>
                  <span>{nodeConns.length} connections</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connections table */}
        {connections.length > 0 && (
          <div style={{ padding: "0 24px 24px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#A1A1AA", marginBottom: 10, letterSpacing: ".3px" }}>
              CONNECTIONS ({connections.filter((c) => c.direction !== "two-way-reverse").length})
            </h3>
            <div style={{ borderRadius: 10, border: "1px solid #1E1E22", overflow: "hidden" }}>
              {connections.filter((c) => c.direction !== "two-way-reverse").map((conn) => {
                const fromNode = nodes.find((n) => n.id === conn.fromNode);
                const toNode = nodes.find((n) => n.id === conn.toNode);
                const fromField = fromNode?.fields.find((f) => f.id === conn.fromField);
                const toField = toNode?.fields.find((f) => f.id === conn.toField);
                if (!fromNode || !toNode) return null;
                const fs = sys(fromNode.system);
                const ts = sys(toNode.system);
                return (
                  <div key={conn.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderBottom: "1px solid #1E1E22",
                    background: "#141416", flexWrap: "wrap",
                  }}>
                    <Badge color={fs.color}>{fromNode.name}</Badge>
                    <span style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      .{fromField?.name || "?"}
                    </span>
                    <span style={{ color: "#F59E0B", fontSize: 14 }}>
                      {conn.direction === "two-way" ? "⇄" : "→"}
                    </span>
                    <Badge color={ts.color}>{toNode.name}</Badge>
                    <span style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      .{toField?.name || "?"}
                    </span>
                    {conn.via && (
                      <span style={{
                        marginLeft: "auto", fontSize: 10, color: "#6B21A8",
                        background: "#6B21A812", padding: "2px 8px", borderRadius: 5,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        via {conn.via}
                      </span>
                    )}
                    <button
                      onClick={() => deleteConnection(conn.id)}
                      style={{ marginLeft: conn.via ? 4 : "auto", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Node Modal ─── */}
      <Modal open={addNodeOpen} onClose={() => setAddNodeOpen(false)} title="Add System / Module">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>System</label>
            <select value={newSystem} onChange={(e) => setNewSystem(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Module / Form / Table Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Leads, Project Tracker, Deals..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>App / Workspace (optional)</label>
            <input value={newApp} onChange={(e) => setNewApp(e.target.value)} placeholder="e.g. confirmhomeassessment" style={inputStyle} />
          </div>
          <button onClick={addNode} style={btnPrimary}>Add to Map</button>
        </div>
      </Modal>

      {/* ─── Edit Node / Add Fields Modal ─── */}
      <Modal open={!!editNodeId} onClose={() => setEditNodeId(null)} title="Edit Fields">
        {(() => {
          const node = nodes.find((n) => n.id === editNodeId);
          if (!node) return null;
          const s = sys(node.system);
          return (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Badge color={s.color}>{s.icon} {s.label} · {node.name}</Badge>
              </div>
              {node.fields.map((f) => (
                <FieldRow
                  key={f.id} field={f} systemColor={s.color}
                  onToggleCritical={() => toggleCritical(node.id, f.id)}
                  onDelete={() => deleteField(node.id, f.id)}
                />
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Field Name</label>
                  <input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g. Client_Email" style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && addField(node.id)} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={labelStyle}>Type</label>
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button onClick={() => addField(node.id)}
                  style={{ ...btnPrimary, padding: "9px 14px", whiteSpace: "nowrap" }}>+</button>
              </div>
              <p style={{ color: "#666", fontSize: 11, marginTop: 10 }}>
                🔴 = critical field (click dot to toggle). Tap a field on the card to run impact analysis.
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* ─── Add Connection Modal ─── */}
      <Modal open={addConnOpen} onClose={() => setAddConnOpen(false)} title="Add Connection">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>From (Source)</label>
            <select value={connFrom.node} onChange={(e) => setConnFrom({ node: e.target.value, field: "" })}
              style={inputStyle}>
              <option value="">Select system…</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{sys(n.system).icon} {n.name}</option>)}
            </select>
            {connFrom.node && (
              <select value={connFrom.field} onChange={(e) => setConnFrom({ ...connFrom, field: e.target.value })}
                style={{ ...inputStyle, marginTop: 8 }}>
                <option value="">Select field…</option>
                {nodes.find((n) => n.id === connFrom.node)?.fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <select value={connDirection} onChange={(e) => setConnDirection(e.target.value)}
              style={{ ...inputStyle, width: "auto", textAlign: "center" }}>
              <option value="one-way">→ One-way</option>
              <option value="two-way">⇄ Two-way sync</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>To (Destination)</label>
            <select value={connTo.node} onChange={(e) => setConnTo({ node: e.target.value, field: "" })}
              style={inputStyle}>
              <option value="">Select system…</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{sys(n.system).icon} {n.name}</option>)}
            </select>
            {connTo.node && (
              <select value={connTo.field} onChange={(e) => setConnTo({ ...connTo, field: e.target.value })}
                style={{ ...inputStyle, marginTop: 8 }}>
                <option value="">Select field…</option>
                {nodes.find((n) => n.id === connTo.node)?.fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={labelStyle}>Via (automation / integration)</label>
            <input value={connVia} onChange={(e) => setConnVia(e.target.value)}
              placeholder="e.g. Make Scenario #123, Deluge script, Webhook"
              style={inputStyle} />
          </div>
          <button onClick={addConnection} style={btnPrimary}>Add Connection</button>
        </div>
      </Modal>

      {/* ─── Impact Analysis Modal ─── */}
      <Modal open={impactOpen} onClose={() => setImpactOpen(false)} title="⚠️ Impact Analysis">
        {impactField && (() => {
          const downstream = getDownstream(impactField.node.id, impactField.field.id);
          const upstream = getUpstream(impactField.node.id, impactField.field.id);
          const s = sys(impactField.node.system);
          return (
            <div>
              <div style={{
                padding: "12px 16px", borderRadius: 8, marginBottom: 16,
                background: s.color + "12", border: `1px solid ${s.color}33`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F4F5" }}>
                  {impactField.node.name}.<span style={{ color: s.color }}>{impactField.field.name}</span>
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {impactField.field.type} {impactField.field.critical ? "· 🔴 CRITICAL" : ""}
                </div>
              </div>

              {impactField.field.critical && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                  background: "#7F1D1D22", border: "1px solid #7F1D1D44", fontSize: 12, color: "#FCA5A5",
                }}>
                  ⚠️ This is a <strong>critical field</strong>. Changing or removing it may cascade failures across connected systems.
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  🔽 DOWNSTREAM — what breaks if you change this ({downstream.length})
                </div>
                {downstream.length === 0 ? (
                  <div style={{ color: "#555", fontSize: 12, fontStyle: "italic" }}>No downstream dependencies</div>
                ) : (
                  downstream.map((d, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 0", borderBottom: "1px solid #1E1E22", flexWrap: "wrap",
                    }}>
                      <Badge color={sys(d.node.system).color}>{d.node.name}</Badge>
                      <span style={{ color: "#D4D4D8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        .{d.field.name}
                      </span>
                      {d.field.critical && <span style={{ color: "#EF4444", fontSize: 9 }}>● CRITICAL</span>}
                      {d.via && <span style={{ fontSize: 10, color: "#6B21A8" }}>via {d.via}</span>}
                    </div>
                  ))
                )}
              </div>

              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  🔼 UPSTREAM — what feeds into this ({upstream.length})
                </div>
                {upstream.length === 0 ? (
                  <div style={{ color: "#555", fontSize: 12, fontStyle: "italic" }}>No upstream sources</div>
                ) : (
                  upstream.map((u, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 0", borderBottom: "1px solid #1E1E22", flexWrap: "wrap",
                    }}>
                      <Badge color={sys(u.node.system).color}>{u.node.name}</Badge>
                      <span style={{ color: "#D4D4D8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        .{u.field.name}
                      </span>
                      {u.via && <span style={{ fontSize: 10, color: "#6B21A8" }}>via {u.via}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
