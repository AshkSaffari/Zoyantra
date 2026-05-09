import React, { useMemo, useState } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-gantt';

// Minimal MSPDI (MS Project XML) parser for core fields used by the Gantt
function parseMspdi(xmlText) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const getText = (el, tag) => el.getElementsByTagName(tag)[0]?.textContent ?? '';
    const tasks = Array.from(doc.getElementsByTagName('Task'))
      .map(t => {
        const uid = Number(getText(t, 'UID') || 0);
        const name = getText(t, 'Name') || `Task ${uid}`;
        const startStr = getText(t, 'Start');
        const finishStr = getText(t, 'Finish');
        const start = startStr ? new Date(startStr) : null;
        const finish = finishStr ? new Date(finishStr) : null;
        const parentRaw = getText(t, 'OutlineParentUID');
        const parent = parentRaw ? Number(parentRaw) : null;
        return {
          TaskID: uid,
          TaskName: name,
          StartDate: start && !isNaN(+start) ? start : null,
          EndDate: finish && !isNaN(+finish) ? finish : null,
          Duration: getText(t, 'Duration'),
          PercentDone: Number(getText(t, 'PercentComplete') || 0),
          ParentID: parent ?? undefined
        };
      })
      // Filter out project summary row (UID 0) and rows completely empty
      .filter(row => row.TaskID !== 0 && (row.TaskName || row.StartDate || row.EndDate));
    return tasks;
  } catch (e) {
    console.error('Failed to parse MSPDI XML', e);
    return [];
  }
}

async function fetchXml(url, bearerToken) {
  const res = await fetch(url, bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : undefined);
  if (!res.ok) throw new Error(`Failed to fetch XML: ${res.status}`);
  return await res.text();
}

export default function MspGanttTab({ selectedProject }) {
  const [xmlText, setXmlText] = useState('');
  const [error, setError] = useState('');
  const [loadedList, setLoadedList] = useState(() => {
    try {
      const key = selectedProject ? `msp_xml_loaded_${selectedProject.id}` : 'msp_xml_loaded';
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  });

  const pushLoaded = (label) => {
    const entry = { id: Date.now(), label, at: new Date().toISOString() };
    const key = selectedProject ? `msp_xml_loaded_${selectedProject.id}` : 'msp_xml_loaded';
    const next = [entry, ...loadedList].slice(0, 20);
    setLoadedList(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const data = useMemo(() => (xmlText ? parseMspdi(xmlText) : []), [xmlText]);

  const onFile = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setXmlText(text);
    pushLoaded(file.name);
  };

  // SharePoint loader removed per request

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">MSP Gantt (MS Project XML)</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Load from file (.xml)</label>
            <input type="file" accept=".xml" onChange={onFile} className="block w-full" />
          </div>
        </div>
        {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-2">
        {data.length === 0 ? (
          <div className="p-6 text-gray-600">Load an MSP XML file to view the Gantt.</div>
        ) : (
          <GanttComponent
            dataSource={data}
            height="600px"
            taskFields={{
              id: 'TaskID',
              name: 'TaskName',
              startDate: 'StartDate',
              endDate: 'EndDate',
              duration: 'Duration',
              progress: 'PercentDone',
              parentID: 'ParentID'
            }}
            allowSelection
            enableVirtualization
            treeColumnIndex={1}
          >
            <ColumnsDirective>
              <ColumnDirective field="TaskID" headerText="ID" width="90" />
              <ColumnDirective field="TaskName" headerText="Task" width="250" />
              <ColumnDirective field="StartDate" headerText="Start" />
              <ColumnDirective field="EndDate" headerText="Finish" />
              <ColumnDirective field="PercentDone" headerText="%" width="90" />
            </ColumnsDirective>
          </GanttComponent>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-2">Recently Loaded XML</h4>
        {loadedList.length === 0 ? (
          <div className="text-sm text-gray-500">Nothing loaded yet.</div>
        ) : (
          <ul className="text-sm list-disc pl-5">
            {loadedList.map(item => (
              <li key={item.id} className="py-0.5">
                <span className="font-medium">{item.label}</span>
                <span className="text-gray-500"> — {new Date(item.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


