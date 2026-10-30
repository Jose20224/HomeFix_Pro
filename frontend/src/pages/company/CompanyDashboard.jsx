import { useEffect, useState } from 'react';
import { companiesApi, requestsApi } from '../../services/api';
import StatusChip from '../../components/ui/StatusChip';
const titles = { datos: 'Mi empresa', despacho: 'Despacho', empleados: 'Empleados' };
export default function CompanyDashboard({ section = 'datos' }) {
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [available, setAvailable] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [assignments, setAssignments] = useState({});
  const refresh = async () => {
    const [c, e, j, a] = await Promise.all([companiesApi.mine(), companiesApi.employees(), companiesApi.jobs(), requestsApi.available()]);
    setCompany(c); setEmployees(e); setJobs(j); setAvailable(a);
  };
  useEffect(() => { refresh().catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  const act = async action => { setBusy(true); setError(''); setMessage(''); try { await action(); await refresh(); setMessage('Cambios guardados'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <div className="space-y-6 max-w-5xl mx-auto"><h1 className="text-2xl font-bold">{titles[section]}</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status">{message}</p>}{loading && <p>Cargando empresa…</p>}
    {company && <>{section === 'datos' && <form className="bg-white border rounded-xl p-5 space-y-3" onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      act(() => companiesApi.update({ name: data.get('name'), address: data.get('address'), ruc: data.get('ruc') }));
    }}><h2 className="font-bold">Datos y verificación</h2><p>Estado: {company.verificationStatus}</p>
      <label className="block">Nombre<input required name="name" defaultValue={company.name} className="block border p-2 rounded w-full" /></label>
      <label className="block">Dirección<input required name="address" defaultValue={company.address || ''} className="block border p-2 rounded w-full" /></label>
      <label className="block">RUC<input required name="ruc" defaultValue={company.ruc || ''} className="block border p-2 rounded w-full" /></label>
      <button disabled={busy} className="bg-blue-700 text-white p-2 rounded">Guardar</button>
    </form>}
    {section === 'empleados' && <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="text-xl font-bold">Empleados</h2>
      <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); act(async () => { await companiesApi.addEmployee({ email }); setEmail(''); }); }}>
        <input aria-label="Correo del técnico" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Correo del técnico registrado" className="border p-2 rounded grow" />
        <button disabled={busy} className="bg-blue-700 text-white p-2 rounded">Agregar técnico</button>
      </form>
      {employees.map(employee => <div key={employee.id} className="flex flex-wrap justify-between gap-3 border-t pt-3"><span>{employee.user.fullName} · {employee.user.techProfile?.verificationStatus} · {employee.user.isActive ? 'Activo' : 'Inactivo'}</span><button disabled={busy} onClick={() => act(() => companiesApi.removeEmployee(employee.id))} className="text-red-700">Retirar</button></div>)}
      {!employees.length && <p>No hay empleados registrados.</p>}
    </section>}
    {section === 'despacho' && <><section className="space-y-3"><h2 className="text-xl font-bold">Despacho de solicitudes</h2><p>La empresa y el técnico deben estar verificados para asignar servicios.</p>
      {available.map(job => <article key={job.id} className="bg-white border p-5 rounded-xl space-y-3"><h3 className="font-bold">{job.title}</h3><p>{job.category.name} · {job.neighborhood || 'Zona no especificada'}</p><StatusChip status={job.urgency} />
        <div className="flex flex-wrap gap-2"><select aria-label={'Técnico para ' + job.title} value={assignments[job.id] || ''} onChange={event => setAssignments({ ...assignments, [job.id]: event.target.value })} className="border p-2 rounded">
          <option value="">Selecciona un técnico</option>{employees.filter(employee => employee.user.isActive && employee.user.techProfile?.verificationStatus === 'VERIFICADO').map(employee => <option key={employee.id} value={employee.userId}>{employee.user.fullName}</option>)}
        </select><button disabled={busy || !assignments[job.id] || company.verificationStatus !== 'VERIFICADO'} onClick={() => act(() => companiesApi.assignJob({ requestId: job.id, technicianId: Number(assignments[job.id]) }))} className="bg-blue-700 text-white p-2 rounded disabled:opacity-40">Asignar</button></div>
      </article>)}{!available.length && <p>No hay solicitudes disponibles.</p>}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">Trabajos de la empresa</h2>{jobs.map(job => <article key={job.id} className="bg-white border p-5 rounded-xl space-y-2"><h3 className="font-bold">{job.title}</h3><StatusChip status={job.status} /><p>{job.client.fullName} · {job.address}</p><p>Técnico: {job.technician.fullName}</p>
      {['ASIGNADO', 'EN_PROGRESO'].includes(job.status) && <button disabled={busy} onClick={() => act(() => companiesApi.updateStatus(job.id, job.status === 'ASIGNADO' ? 'EN_PROGRESO' : 'FINALIZADO'))} className="text-blue-700 underline">{job.status === 'ASIGNADO' ? 'Iniciar servicio' : 'Finalizar servicio'}</button>}
    </article>)}{!jobs.length && <p>No hay trabajos asignados.</p>}</section></>}</>}
  </div>;
}
