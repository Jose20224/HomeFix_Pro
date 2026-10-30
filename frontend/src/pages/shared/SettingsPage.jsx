import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { authApi, categoriesApi, specialtyCode } from '../../services/api';
import './SettingsPage.css';

const dashboardPaths = { CLIENTE: '/dashboard/cliente', TECNICO: '/dashboard/tecnico', EMPRESA: '/dashboard/empresa', ADMIN: '/dashboard/admin' };
const roleNames = { CLIENTE: 'Cliente', TECNICO: 'Técnico', EMPRESA: 'Empresa', ADMIN: 'Administrador' };
const profileValues = user => ({ fullName: user.fullName || '', phone: user.phone || '', address: user.address || '', ...(user.role === 'TECNICO' ? { specialty: user.techProfile?.specialty || '', bio: user.techProfile?.bio || '' } : {}) });
const cleanValues = form => Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));

function Icon({ name, className = '' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-8h6v8" /></>,
    arrow: <><path d="m12 5-7 7 7 7" /><path d="M5 12h14" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    save: <><path d="m19 21 2-2V5l-2-2H5L3 5v14l2 2Z" /><path d="M7 3v6h10V3M7 21v-7h10v7" /></>,
    logout: <><path d="M9 4H4v16h5M14 8l4 4-4 4M9 12h12" /></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /><path d="M20 2v4M18 4h4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  };
  return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.person}</svg>;
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm] = useState(() => profileValues(user));
  const [saved, setSaved] = useState(() => profileValues(user));
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [categories, setCategories] = useState([]);
  useEffect(() => { if (user.role === 'TECNICO') categoriesApi.list().then(setCategories).catch(error => setFeedback({ type: 'error', message: error.message })); }, [user.role]);
  const homePath = dashboardPaths[user.role] || '/login';
  const role = roleNames[user.role] || 'Usuario';
  const initials = user.fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('').toUpperCase() || 'HF';
  const cleanForm = cleanValues(form);
  const cleanSaved = cleanValues(saved);
  const changed = Object.keys(cleanForm).some(key => cleanForm[key] !== cleanSaved[key]);
  const complete = [cleanForm.fullName, user.email, cleanForm.phone, cleanForm.address].filter(Boolean).length;
  const percentage = complete * 25;
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-NI', { month: 'long', year: 'numeric', timeZone: 'America/Managua' }) : null;
  const change = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setFeedback(null); };
  const discard = () => { setForm({ ...saved }); setFeedback(null); };
  const save = async event => {
    event.preventDefault();
    if (busy || !changed) return;
    if (!cleanForm.fullName) { setFeedback({ type: 'error', message: 'Escribe tu nombre completo para guardar el perfil.' }); return; }
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await authApi.updateProfile(cleanForm);
      const values = profileValues(updated);
      setForm(values);
      setSaved(values);
      setFeedback({ type: 'success', message: '¡Listo! Los cambios de tu perfil se guardaron.' });
      try { await refreshUser(); }
      catch { setFeedback({ type: 'success', message: 'Cambios guardados. Recarga la página para actualizar el resumen de tu cuenta.' }); }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No pudimos guardar tus cambios. Intenta nuevamente.' });
    } finally { setBusy(false); }
  };

  return <div className="settings-page">
    <header className="settings-topbar">
      <div className="settings-topbar-inner">
        <Link to={homePath} className="settings-brand" aria-label="HomeFix Pro, volver al inicio"><span className="settings-brand-mark"><Icon name="home" /></span><span>HomeFix<span className="settings-brand-pro"> Pro</span></span></Link>
        <Link to={homePath} className="settings-back"><Icon name="arrow" /><span>Volver al inicio</span></Link>
      </div>
    </header>

    <main className="settings-main">
      <div className="settings-breadcrumb"><Link to={homePath}>Inicio</Link><span aria-hidden="true">/</span><span>Ajustes</span></div>
      <section className="settings-hero" aria-labelledby="settings-title">
        <div className="settings-hero-copy"><p className="settings-eyebrow"><span /> TU ESPACIO EN HOMEFIX</p><h1 id="settings-title">Tu cuenta, a tu manera<span>.</span></h1><p>Unos pequeños ajustes para que todo funcione mejor para ti.</p></div>
        <div className="settings-hero-detail"><span className="settings-hero-icon"><Icon name="spark" /></span><span>Un perfil completo.<br /><strong>Una mejor conexión.</strong></span></div>
      </section>

      <div className="settings-grid">
        <aside className="settings-sidebar" aria-label="Resumen de tu perfil">
          <section className="settings-profile-card">
            <div className="settings-profile-cover"><span className="settings-profile-cover-ring" /></div>
            <div className="settings-avatar" aria-label={'Iniciales de ' + user.fullName}>{initials}<span className="settings-avatar-status" aria-label={user.isActive ? 'Cuenta activa' : 'Cuenta inactiva'} /></div>
            <div className="settings-profile-body">
              <span className="settings-role"><Icon name="shield" />{role}</span>
              <h2>{user.fullName}</h2><p className="settings-profile-email">{user.email}</p>
              <div className="settings-profile-progress">
                <div><span>Tu perfil está completo al</span><strong>{percentage}%</strong></div>
                <div className="settings-progress-track" role="progressbar" aria-label="Perfil completado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: percentage + '%' }} /></div>
                <p>{percentage === 100 ? '¡Todo listo! Tu información está completa.' : 'Añade tus datos de contacto para completar tu perfil.'}</p>
              </div>
              {since && <p className="settings-member-since">En HomeFix desde {since}</p>}
            </div>
          </section>
          <nav className="settings-section-nav" aria-label="Secciones de ajustes">
            <a href="#personal" onClick={() => setActiveSection('personal')} className={'settings-section-link' + (activeSection === 'personal' ? ' is-active' : '')}><Icon name="person" /><span>Información personal</span><span aria-hidden="true">↗</span></a>
            <a href="#contacto" onClick={() => setActiveSection('contacto')} className={'settings-section-link' + (activeSection === 'contacto' ? ' is-active' : '')}><Icon name="phone" /><span>Datos de contacto</span><span aria-hidden="true">↗</span></a>
            <a href="#cuenta" onClick={() => setActiveSection('cuenta')} className={'settings-section-link' + (activeSection === 'cuenta' ? ' is-active' : '')}><Icon name="shield" /><span>Mi cuenta</span><span aria-hidden="true">↗</span></a>
          </nav>
          <div className="settings-tip"><Icon name="info" /><p>Tu información de contacto ayuda a coordinar tus servicios con mayor facilidad.</p></div>
        </aside>

        <div className="settings-content">
          <form className="settings-form-card" onSubmit={save} aria-busy={busy}>
            <section id="personal" className="settings-form-section">
              <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="person" /></span><div><h2>Información personal</h2><p>Así te identificamos dentro de HomeFix.</p></div></div>
              <div className="settings-fields">
                <div className="settings-field"><label htmlFor="settings-name">Nombre completo <span>*</span></label><div className="settings-input-wrap"><Icon name="person" /><input id="settings-name" name="fullName" autoComplete="name" required maxLength={150} disabled={busy} value={form.fullName} onChange={event => change('fullName', event.target.value)} placeholder="¿Cómo te llamas?" /></div></div>
                <div className="settings-field"><label htmlFor="settings-email">Correo electrónico <span className="settings-label-tag"><Icon name="lock" />Solo lectura</span></label><div className="settings-input-wrap settings-input-readonly"><Icon name="mail" /><input id="settings-email" type="email" autoComplete="email" value={user.email} readOnly aria-describedby="settings-email-help" /></div><p id="settings-email-help" className="settings-field-help">El correo que utilizas para iniciar sesión.</p></div>
              </div>
            </section>

            <section id="contacto" className="settings-form-section">
              <div className="settings-section-heading"><span className="settings-section-icon settings-icon-teal"><Icon name="phone" /></span><div><h2>Datos de contacto</h2><p>Facilita la comunicación y la coordinación de tus servicios.</p></div></div>
              <div className="settings-fields">
                <div className="settings-field"><label htmlFor="settings-phone">Número de teléfono <span className="settings-optional">Opcional</span></label><div className="settings-input-wrap"><Icon name="phone" /><input id="settings-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} disabled={busy} value={form.phone} onChange={event => change('phone', event.target.value)} placeholder="Ej. 8888-1234" /></div><p className="settings-field-help">Un número donde puedan contactarte.</p></div>
                <div className="settings-field settings-field-wide"><label htmlFor="settings-address">Dirección <span className="settings-optional">Opcional</span></label><div className="settings-input-wrap settings-textarea-wrap"><Icon name="location" /><textarea id="settings-address" name="address" autoComplete="street-address" rows={2} maxLength={500} disabled={busy} value={form.address} onChange={event => change('address', event.target.value)} placeholder="Barrio, calle y una referencia de tu ubicación" /></div></div>
              </div>
            </section>

            {user.role === 'TECNICO' && <section id="profesional" className="settings-form-section">
              <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="shield" /></span><div><h2>Perfil profesional</h2><p>Los clientes lo ven al buscar técnicos.</p></div></div>
              <div className="settings-fields">
                <div className="settings-field settings-field-wide"><label htmlFor="settings-specialty">Especialidad</label><div className="settings-input-wrap"><Icon name="spark" /><select id="settings-specialty" name="specialty" disabled={busy || !categories.length} value={form.specialty} onChange={event => change('specialty', event.target.value)}>{categories.map(category => <option key={category.id} value={specialtyCode(category.name)}>{category.name}</option>)}</select></div></div>
                <div className="settings-field settings-field-wide"><label htmlFor="settings-bio">Biografía <span className="settings-optional">Opcional</span></label><div className="settings-input-wrap settings-textarea-wrap"><Icon name="person" /><textarea id="settings-bio" name="bio" rows={3} maxLength={1000} disabled={busy} value={form.bio} onChange={event => change('bio', event.target.value)} placeholder="Tu experiencia y los trabajos que realizas" /></div></div>
              </div>
            </section>}

            <div className="settings-feedback-region" aria-live="polite">
              {feedback && <div className={'settings-feedback settings-feedback-' + feedback.type} role={feedback.type === 'error' ? 'alert' : 'status'}><Icon name={feedback.type === 'error' ? 'info' : 'check'} /><span>{feedback.message}</span></div>}
            </div>
            <footer className="settings-actions">
              <p className={'settings-save-state' + (changed ? ' settings-save-pending' : '')}><span />{busy ? 'Guardando tu información…' : changed ? 'Tienes cambios sin guardar' : 'Tu perfil está al día'}</p>
              <div className="settings-action-buttons"><button type="button" className="settings-button settings-button-secondary" onClick={discard} disabled={!changed || busy}>Descartar</button><button type="submit" className="settings-button settings-button-primary" disabled={!changed || busy}><Icon name={busy ? 'spark' : 'save'} />{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
            </footer>
          </form>

          <section id="cuenta" className="settings-account-card">
            <div className="settings-account-info"><span className="settings-section-icon settings-icon-neutral"><Icon name="shield" /></span><div><h2>Mi cuenta</h2><p>Has iniciado sesión como <strong>{role.toLowerCase()}</strong>.</p></div></div>
            <button type="button" className="settings-logout-button" onClick={logout}><Icon name="logout" />Cerrar sesión</button>
          </section>
        </div>
      </div>
      <footer className="settings-page-footer"><span>HomeFix Pro</span><p>Tu hogar en buenas manos.</p></footer>
    </main>
  </div>;
}
