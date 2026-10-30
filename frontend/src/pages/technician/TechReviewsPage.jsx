import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { reviewsApi } from '../../services/api';
import StarRating from '../../components/ui/StarRating';
export default function TechReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { reviewsApi.forTechnician(user.id).then(setReviews).catch(err => setError(err.message)).finally(() => setLoading(false)); }, [user.id]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return <div className="max-w-4xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Mis reseñas</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p>Cargando reseñas…</p> : <><div className="bg-white p-6 rounded-xl border"><StarRating value={average} readOnly /><p>{reviews.length} reseñas</p></div>
      {!reviews.length && !error && <p>Todavía no has recibido reseñas.</p>}
      {reviews.map(review => <article key={review.id} className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold">{review.clientName}</h2><StarRating value={review.rating} readOnly />
        <p className="text-sm text-slate-500">{new Date(review.createdAt).toLocaleDateString('es-NI')} · {review.request.category.name}</p>
        <p className="mt-3 whitespace-pre-wrap">{review.comment || 'Sin comentario'}</p>
      </article>)}</>}
  </div>;
}
