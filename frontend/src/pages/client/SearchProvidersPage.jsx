import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { providersApi, categoriesApi, specialtyCode } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
export default function SearchProvidersPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  useEffect(() => { categoriesApi.list().then(setCategories).catch(err => setError(err.message)); }, []);
  useEffect(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location.trim()) params.set('location', location.trim());
    const suffix = params.size ? '?' + params.toString() : '';
    providersApi.list(suffix).then(setTechnicians).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [category, location]);
  const filtered = technicians.filter(tech => (tech.fullName + ' ' + tech.techProfile.specialty).toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-screen bg-background"><Sidebar /><div className="md:ml-64"><TopBar userName={user.fullName} /><main className="p-lg max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold mb-4">Técnicos verificados</h2>
    <div className="grid gap-3 md:grid-cols-3 mb-4"><input aria-label="Buscar técnicos" placeholder="Nombre o especialidad" className="border rounded-lg p-3" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Filtrar por categoría" className="border rounded-lg p-3" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas las categorías</option>{categories.map(item => <option key={item.id} value={specialtyCode(item.name)}>{item.name}</option>)}</select>
      <input aria-label="Filtrar por ubicación" placeholder="Barrio, zona o ciudad" className="border rounded-lg p-3" value={location} onChange={e => setLocation(e.target.value)} /></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{loading && <p>Cargando técnicos…</p>}
    {!loading && !error && !filtered.length && <p>No hay técnicos que coincidan con la búsqueda.</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">{filtered.map(tech => <Card key={tech.id} className="p-lg">
      <h3 className="font-bold">{tech.fullName} <span className="text-blue-700">✓</span></h3>
      <p>{tech.techProfile.specialty.replaceAll('_', ' ')}</p>
      <p className="my-3">★ {tech.techProfile.avgRating.toFixed(1)} · {tech.techProfile.totalJobs} trabajos</p>
      <p className="text-sm text-slate-500">{tech.techProfile.bio}</p>
      {tech.address && <p className="text-sm text-slate-500 mt-2">Ubicación: {tech.address}</p>}
      <Link to="/cliente/solicitar" className="block mt-4 text-blue-700 underline">Crear una solicitud de servicio</Link>
    </Card>)}</div>
  </main></div></div>;
}
