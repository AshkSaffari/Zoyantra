import React, { useMemo } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';

// Map app tasks + optional predecessors into gantt-task-react structures
export default function TasksGanttView({ tasks = [] }) {
  const { ganttTasks, links } = useMemo(() => {
    const safeList = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
    const gt = [];
    const idMap = new Map();
    const today = new Date();
    safeList.forEach((t, idx) => {
      const id = String(t.id ?? idx);
      const startRaw = t.startDate || t.start || t.StartDate;
      const endRaw = t.endDate || t.end || t.EndDate;
      const start = startRaw ? new Date(startRaw) : today;
      const end = endRaw ? new Date(endRaw) : dayjs(start).add(1, 'day').toDate();
      const progress = Number(t.progress ?? (t.status === 'completed' ? 100 : 0));
      const item = {
        start,
        end,
        name: t.name || t.taskName || 'Task',
        id,
        type: 'task',
        progress,
        displayOrder: idx
      };
      idMap.set(t.id ?? idx, id);
      gt.push(item);
    });

    const linkList = [];
    safeList.forEach((t) => {
      // predecessors may be array of ids or array of objects {id,type}
      let preds = [];
      if (Array.isArray(t.predecessors)) preds = t.predecessors;
      else if (typeof t.predecessors === 'string') preds = t.predecessors.split(',');

      preds.filter(Boolean).forEach((p, i) => {
        const pid = typeof p === 'object' ? p.id : p;
        const ptype = typeof p === 'object' ? (p.type || 'FS') : 'FS';
        const source = idMap.get(pid) ?? String(pid);
        const target = idMap.get(t.id) ?? String(t.id);
        if (source && target && source !== target) {
          linkList.push({ id: `${target}-${i}`, source, target, type: ptype });
        }
      });
    });

    return { ganttTasks: gt, links: linkList };
  }, [tasks]);

  if (!ganttTasks.length) {
    return <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">No tasks to display in Gantt.</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Day}
        preStepsCount={1}
        links={links}
        listCellWidth="200px"
        columnWidth={60}
        barFill={60}
        barCornerRadius={3}
        locale="en-US"
      />
    </div>
  );
}


