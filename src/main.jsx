import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './styles.css';

const ROLES = ['Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral'];
const STATUSES = ['Pendente','Ativo','Inativo','Suspenso','Afastado'];
const ADMIN_ROLES = ['Supervisor','Responsável','Responsável Geral'];
const today = () => new Date().toLocaleDateString('en-CA');
const errText = (e) => e?.message || 'Ocorreu um erro inesperado.';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupId, setSignupId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDiscord, setSignupDiscord] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupMessage, setSignupMessage] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [telagemRows,setTelagemRows]=useState([]); const [suggestions,setSuggestions]=useState([]); const [suggestionMessages,setSuggestionMessages]=useState([]); const [suggestionPage,setSuggestionPage]=useState(0); const [activeSuggestion,setActiveSuggestion]=useState(null); const [suggestionDraft,setSuggestionDraft]=useState({title:'',content:''}); const [suggestionMessageDraft,setSuggestionMessageDraft]=useState(''); const [chatMinimized,setChatMinimized]=useState(false); const chatEndRef=useRef(null); const [keyTransactions,setKeyTransactions]=useState([]); const [weeklyBoxPurchases,setWeeklyBoxPurchases]=useState([]); const [boxInventory,setBoxInventory]=useState([]); const [tokenTransactions,setTokenTransactions]=useState([]); const [mysteryBoxLogs,setMysteryBoxLogs]=useState([]); const [lastBoxResult,setLastBoxResult]=useState(null); const [telagemDraft,setTelagemDraft]=useState({player_name:'',discord:'',event_name:'',occurred_at:''});
  const [participationLogs, setParticipationLogs] = useState([]);
  const [eventRegistrationLogs, setEventRegistrationLogs] = useState([]);
  const [eventCredits, setEventCredits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleResponses,setScheduleResponses] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLogCategory, setSelectedLogCategory] = useState('events');
  const [agendaEntries, setAgendaEntries] = useState([]);
  const [dailySchedule, setDailySchedule] = useState([]);
  const [dailyDraft, setDailyDraft] = useState(null);
  const [dailyDraftName, setDailyDraftName] = useState('');
  const [dailyDraftTime, setDailyDraftTime] = useState('12:00');
  const [dailyDraftCategory, setDailyDraftCategory] = useState('EVENTOS');
  const [dailyImageVersion, setDailyImageVersion] = useState(0);
  const [agendaSelectedTime,setAgendaSelectedTime]=useState('');
  const [agendaDraft,setAgendaDraft]=useState({event:'',host_id:'',text:''});
  const [agendaSaving,setAgendaSaving]=useState(false);
  const [logPage,setLogPage]=useState(0); const [eventPage,setEventPage]=useState(0);
  const [agendaMonth, setAgendaMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(today());
  const [clockNow,setClockNow] = useState(()=>new Date());
  const [rankingPeriod, setRankingPeriod] = useState('weekly');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const canRegister = Boolean(profile && profile.status === 'Ativo');
  const isDev = Boolean(profile?.tags?.includes('DEV'));
  const canEditMemberData = ADMIN_ROLES.includes(profile?.role) || isDev;
  const canViewMemberDataButton = ADMIN_ROLES.includes(profile?.role) || isDev;
  const canApproveMembers = ADMIN_ROLES.includes(profile?.role);
  const canAddEventCredits = ['Responsável','Responsável Geral'].includes(profile?.role) || isDev;
  const canManageRoles = ADMIN_ROLES.includes(profile?.role) || isDev;
  const canReadLogs = ['Responsável','Responsável Geral'].includes(profile?.role) || isDev;
  const canRemoveMembers = profile?.role === 'Responsável Geral' || isDev;
  const canAccessAgenda = ADMIN_ROLES.includes(profile?.role) || isDev;
  const canViewTeam = Boolean(profile && profile.status === 'Ativo');
  const canViewAdmin = ['Responsável','Responsável Geral'].includes(profile?.role) || isDev;
  const canManageDailySchedule = ADMIN_ROLES.includes(profile?.role) || isDev;

  const isAdmin = Boolean(profile && (ADMIN_ROLES.includes(profile.role) || isDev));
  const notify = (s) => { setToast(s); window.setTimeout(() => setToast(''), 3200); };

  useEffect(() => {
    if (!session?.user || !activeSuggestion?.id) return;
    let alive=true;
    const channel=supabase.channel('suggestion-chat-'+activeSuggestion.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'suggestion_messages',filter:'suggestion_id=eq.'+activeSuggestion.id},async()=>{
        const {data,error}=await supabase.from('suggestion_messages').select('*').eq('suggestion_id',activeSuggestion.id).order('created_at');
        if(alive&&!error)setSuggestionMessages(data||[]);
      }).subscribe();
    return ()=>{alive=false;supabase.removeChannel(channel);};
  },[session?.user?.id,activeSuggestion?.id]);

  useEffect(()=>{if(!chatMinimized&&activeSuggestion?.id)chatEndRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[suggestionMessages,chatMinimized,activeSuggestion?.id]);

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return; }
    const { data, error } = await supabase.from('staff_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== 'Ativo') {
      await supabase.auth.signOut();
      setProfile(null); setSession(null);
      const message = !data ? 'Sua conta ainda não possui um perfil autorizado. Fale com a administração.' : data.status === 'Pendente' ? 'Seu cadastro está aguardando aprovação da administração.' : 'Seu acesso está inativo. Fale com a administração.';
      throw new Error(message);
    }
    setProfile(data);
  }, []);

  const loadData = useCallback(async () => {
    if (!session || !profile) return;
    setBusy(true);
    try {
      const results = await Promise.all([
        supabase.from('staff_profiles').select('user_id,staff_id,name,discord,whatsapp,phone,eqpg,role,status,avatar_url,tags,created_at').order('name'),
        supabase.from('events').select('*').order('event_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('member_event_credits').select('*').order('created_at', { ascending: false }),
        supabase.from('team_goals').select('*').order('created_at', { ascending: false }),
        supabase.from('schedules').select('*').order('schedule_date', { ascending: true }),
        supabase.from('schedule_responses').select('*'),
        supabase.from('availability').select('*').order('available_date', { ascending: true }),
        (canReadLogs ? supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(1000) : Promise.resolve({data:[],error:null})),
        supabase.from('agenda_entries').select('*').order('agenda_date').order('time_slot'),
        supabase.from('daily_schedule_items').select('*').eq('schedule_date',today()).order('event_time'),
        supabase.from('announcements').select('*').order('created_at',{ascending:false}),
        (canReadLogs ? supabase.from('event_participation_logs').select('*').order('created_at',{ascending:false}).limit(2000) : Promise.resolve({data:[],error:null})),
        (canReadLogs ? supabase.from('event_registration_logs').select('*').order('created_at',{ascending:false}).limit(1000) : Promise.resolve({data:[],error:null})),
        (profile.tags?.includes('Telador') || profile.role==='Responsável Geral' || isDev ? supabase.from('telagem_records').select('*').order('occurred_at',{ascending:false}).order('created_at',{ascending:false}) : Promise.resolve({data:[],error:null})),
        supabase.from('suggestions').select('*').order('created_at',{ascending:false}),
        supabase.from('key_wallet_transactions').select('*').order('created_at',{ascending:false}),
        supabase.from('mystery_box_weekly_purchases').select('*').order('purchased_at',{ascending:false}),
        supabase.from('mystery_box_inventory').select('*').order('purchased_at',{ascending:false}),
        supabase.from('token_wallet_transactions').select('*').order('created_at',{ascending:false}),
        (canReadLogs ? supabase.from('mystery_box_logs').select('*').order('created_at',{ascending:false}).limit(1000) : Promise.resolve({data:[],error:null}))
      ]);
      const [m,e,ec,g,s,sr,a,l,ag,ds,an,pl,erl,tr,sug,kw,wbp,bi,tw,mbl] = results;
      for (const r of results) if (r.error) throw r.error;
      setMembers(m.data || []); setEvents(e.data || []); setEventCredits(ec.data || []); setGoals(g.data || []); setSchedules(s.data || []); setScheduleResponses(sr.data || []); setAvailability(a.data || []); setLogs(l.data || []); setAgendaEntries(ag.data || []); setDailySchedule(ds.data || []); setAnnouncements(an.data || []); setParticipationLogs(pl.data || []); setEventRegistrationLogs(erl.data || []); setTelagemRows(tr.data||[]); setSuggestions(sug.data||[]); setKeyTransactions(kw.data||[]); setWeeklyBoxPurchases(wbp.data||[]); setBoxInventory(bi.data||[]); setTokenTransactions(tw.data||[]); setMysteryBoxLogs(mbl.data||[]);
    } catch (e) { notify(`Não foi possível carregar os dados: ${errText(e)}`); }
    finally { setBusy(false); }
  }, [session, profile, canAccessAgenda, canReadLogs]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
    }).catch(e => { if (mounted) setLoginError(errText(e)); }).finally(() => { if (mounted) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update-password');
        setRecoveryError('');
        setRecoveryMessage('');
      }
      if (!nextSession) setProfile(null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  useEffect(() => { if (session?.user && profile) loadData(); }, [session, profile, loadData]);
  useEffect(()=>{const timer=window.setInterval(()=>setClockNow(new Date()),30000);return ()=>window.clearInterval(timer);},[]);

  const writeLog = async (action, detail, entityType = null, entityId = null) => {
    if (!profile || !session?.user) return;
    const { error } = await supabase.from('activity_logs').insert({ actor_id: session.user.id, actor_name: profile.name, action, detail, entity_type: entityType, entity_id: entityId ? String(entityId) : null });
    if (error) console.warn('Não foi possível registrar histórico:', error.message);
  };

  const signIn = async (e) => {
    e.preventDefault(); setLoginError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
      if (error) throw error;
      setSession(data.session);
      await loadProfile(data.user);
      setLoginPassword('');
    } catch (e) { setLoginError(errText(e)); }
    finally { setLoading(false); }
  };
  const requestSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupMessage('');
    if (signupPassword.length < 8) { setSignupError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(), password: signupPassword,
        options: { data: { name: signupName.trim(), staff_id: signupId.trim(), discord: signupDiscord.trim(), phone: signupPhone.trim() } }
      });
      if (error) throw error;
      if (data.session) await supabase.auth.signOut();
      setSignupPassword('');
      setLoginEmail(signupEmail.trim());
      setAuthMode('login');
      setLoginNotice('Solicitação enviada! Seu cadastro ficará Pendente até a administração aprovar e liberar seu acesso.');
    } catch (e) { setSignupError(errText(e)); }
    finally { setLoading(false); }
  };

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setRecoveryMessage('Se existir uma conta com esse e-mail, você receberá uma mensagem com o link para criar uma nova senha. Verifique também a caixa de spam.');
    } catch (e) {
      setRecoveryError(errText(e));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    if (newPassword.length < 8) {
      setRecoveryError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await writeLog('Senha alterada','Cadastro de '+(profile?.name||'membro'),'staff_profiles',session.user.id);
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setNewPassword('');
      setConfirmPassword('');
      setLoginPassword('');
      setAuthMode('login');
      setLoginNotice('Senha alterada com sucesso. Entre usando sua nova senha.');
    } catch (e) {
      setRecoveryError(errText(e));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); setPage('Dashboard'); setAuthMode('login'); };

  const uploadMedia = async (file, folder) => { if (!file) return null; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Envie JPG, PNG ou WEBP.'); if(file.size>5*1024*1024) throw new Error('Imagem deve ter até 5 MB.'); const ext=file.name.split('.').pop().toLowerCase(); const path=`${session.user.id}/${folder}-${Date.now()}.${ext}`; const {error}=await supabase.storage.from('lisboa-media').upload(path,file,{upsert:true,contentType:file.type}); if(error) throw error; return path; };
  const saveEvent = async (form) => {
    if (!canRegister) throw new Error('Seu cargo não pode registrar eventos.');
    const chosen=[...new Set(form.staff_ids||[])];
    const senior=chosen.filter(id=>members.find(m=>m.user_id===id)?.role!=='Treinamento');
    if(senior.length>4) throw new Error('Máximo de 4 staffs com cargo de Aprendiz ou superior.');
    const event_image_path=form.event_image_file?await uploadMedia(form.event_image_file,'event'):null;
    const winner_image_path=form.winner_image_file?await uploadMedia(form.winner_image_file,'winner'):null;
    const payload={name:form.name.trim(),event_date:form.event_date,start_time:form.start_time||null,end_time:null,status:'Concluído',category:'Normal',notes:null,description:null,responsible_id:null,created_by:session.user.id,participants:[],staff_ids:chosen,winners:(form.winner_id||'').split(',').map(v=>v.trim()).filter(Boolean).map((staff_id,i)=>({staff_id,discord:(form.winner_discord||'').split(',').map(v=>v.trim())[i]||''})),event_image_path,winner_image_path};
    const {error}=await supabase.from('events').insert(payload); if(error) throw error;
    const staffNames=chosen.map(id=>members.find(m=>m.user_id===id)?.name||'Membro').join(', ')||'Nenhum staff marcado';
    const eventLogDetail='Evento: '+payload.name+' | Registrado por: '+profile.name+' | Staff: '+staffNames+' | Data: '+(payload.event_date||'—')+' | Hora: '+(payload.start_time||'—');
    await writeLog('Evento registrado',eventLogDetail+' | Eventos contabilizados: '+(isLateGame(payload)?2:1)+' por membro | Chaves creditadas: 1 por membro participante','events');
    setModal(null); await loadData(); notify('Evento registrado com sucesso.');
  };
  const saveAnnouncement = async (form) => {
    if (!['Responsável','Responsável Geral'].includes(profile?.role) && !isDev) throw new Error('Sem permissão para publicar avisos.');
    const image_path=form.image_file?await uploadMedia(form.image_file,'announcement'):null;
    const payload={title:(form.title||'').trim(),content:safeGoalHtml(form.content||''),image_path,created_by:session.user.id};
    if(!payload.content.replace(/<[^>]*>/g,'').trim()) throw new Error('Escreva o conteúdo do aviso.');
    const {error}=await supabase.from('announcements').insert(payload); if(error) throw error;
    await writeLog('Aviso publicado',payload.title||'Novo aviso','announcements');
    setModal(null); await loadData(); notify('Aviso publicado com sucesso.');
  };
  const deleteAnnouncement = async (row) => { if((!['Responsável','Responsável Geral'].includes(profile?.role)&&!isDev)||!confirm('Excluir este aviso?'))return; const {error}=await supabase.from('announcements').delete().eq('id',row.id);if(error)return notify(errText(error));await writeLog('Aviso excluído',row.title||'Aviso','announcements',row.id);await loadData();notify('Aviso excluído.');};

  const deleteEvent = async (row) => { if (!confirm(`Excluir o evento “${row.name}”?`)) return; const { error } = await supabase.from('events').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Evento excluído', row.name, 'events', row.id); await loadData(); notify('Evento excluído.'); };

  const saveEventCredit = async (form) => {
    if (!canAddEventCredits) throw new Error('Somente Responsável ou Responsável Geral pode ajustar eventos.');
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Informe uma quantidade inteira entre 1 e 10.000.');
    const operation = form.operation || 'add';
    const { error } = await supabase.rpc('adjust_member_event_credits', { p_user_id: form.user_id, p_quantity: quantity, p_operation: operation, p_include_in_ranking: form.include_in_ranking !== false });
    if (error) throw error;
    await writeLog(operation==='add'?'Eventos adicionados':'Eventos removidos', quantity+' evento(s) '+(operation==='add'?'adicionado(s) para ':'removido(s) de ')+form.member_name+' | Ranking: '+(form.include_in_ranking!==false?'incluído':'não incluído'), 'member_event_credits', form.user_id);
    setModal(null); await loadData(); notify(operation==='add'?'Eventos adicionados com sucesso.':'Eventos removidos com sucesso.');
  };

  const saveWalletAdjustment=async(form)=>{if(!['Responsável','Responsável Geral'].includes(profile?.role)&&!isDev)throw new Error('Sem permissão para gerenciar carteiras.');const {error}=await supabase.rpc('adjust_member_wallet',{p_user_id:form.user_id,p_wallet_type:form.wallet_type,p_quantity:Number(form.quantity),p_operation:form.operation});if(error)throw error;setModal(null);await loadData();notify('Movimentação registrada com sucesso.');};
  const buyMysteryBoxes=async(type)=>{const {error}=await supabase.rpc('purchase_mystery_boxes',{p_box_type:type});if(error)throw error;await loadData();notify('Você recebeu 5 caixas '+type+'.');};
  const saoPauloToday=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  const saoPauloWeekday=saoPauloToday.getDay();
  const saoPauloWeekStart=new Date(saoPauloToday);saoPauloWeekStart.setDate(saoPauloToday.getDate()-(saoPauloToday.getDay()+6)%7);
  const saoPauloWeekKey=[saoPauloWeekStart.getFullYear(),String(saoPauloWeekStart.getMonth()+1).padStart(2,'0'),String(saoPauloWeekStart.getDate()).padStart(2,'0')].join('-');
  const hasWeeklyBoxPurchase=weeklyBoxPurchases.some(x=>x.week_start===saoPauloWeekKey);
  const mysteryBoxPurchaseOpen=saoPauloWeekday===6||saoPauloWeekday===0;
  const openMysteryBox=async(type)=>{const {data,error}=await supabase.rpc('open_mystery_box',{p_box_type:type});if(error)throw error;setLastBoxResult(data);await loadData();};

  const saveGoal = async (form) => {
    const payload = { title: form.title.trim(), description: safeGoalHtml(form.description || '') || null, target_quantity: Number(form.target_quantity || 0), period_start: form.period_start || null, period_end: form.period_end || null, responsible_id: form.responsible_id || null, created_by: session.user.id };
    const q = form.id ? supabase.from('team_goals').update(payload).eq('id', form.id) : supabase.from('team_goals').insert(payload);
    const { error } = await q; if (error) throw error; await writeLog(form.id ? 'Meta editada' : 'Meta postada', payload.title, 'team_goals', form.id); setModal(null); await loadData(); notify('Meta salva.');
  };
  const deleteGoal = async (row) => { if (!confirm(`Excluir a meta “${row.title}”?`)) return; const { error } = await supabase.from('team_goals').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Meta excluída', row.title, 'team_goals', row.id); await loadData(); };

  const saveSchedule = async (form) => {
    const payload = { title: form.title.trim(), schedule_date: form.schedule_date, start_time: form.start_time || null, end_time: form.end_time || null, responsible_id: form.responsible_id || null, assigned_members: form.assigned_members || [], notes: form.notes || null, created_by: session.user.id };
    const q = form.id ? supabase.from('schedules').update(payload).eq('id', form.id) : supabase.from('schedules').insert(payload);
    const { error } = await q; if (error) throw error; await writeLog(form.id ? 'Escala atualizada' : 'Escala criada', payload.title, 'schedules', form.id); setModal(null); await loadData(); notify('Escala salva.');
  };
  const deleteSchedule = async (row) => { if (!confirm(`Excluir “${row.title}”?`)) return; const { error } = await supabase.from('schedules').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Escala excluída', row.title, 'schedules', row.id); await loadData(); };

  const deleteAgendaEntry=async(row)=>{if(!canAccessAgenda||!confirm('Excluir esta agenda postada?'))return;const {error}=await supabase.from('agenda_entries').delete().eq('id',row.id);if(error)return notify(errText(error));await writeLog('Agenda excluída',row.agenda_date+' '+row.time_slot+' · '+(row.event||'Evento'),'agenda_entries',row.id);await loadData();notify('Agenda excluída.');};
  const saveAgendaEntry = async (date,time,values) => {
    if(!canAccessAgenda) throw new Error('Você não tem permissão para editar a Agenda.');
    const normalizedTime=String(time).length===5?String(time)+':00':String(time);
    const existing=agendaEntries.find(x=>x.agenda_date===date&&x.time_slot?.slice(0,5)===normalizedTime.slice(0,5));
    const nextStatus=values.status||existing?.status||'Agendado';
    const isRescheduled=nextStatus==='Remarcado'&&!values.reschedule_unconfirmed&&!!values.reschedule_date&&!!values.reschedule_time;
    const targetDate=isRescheduled?values.reschedule_date:null;
    const targetTime=isRescheduled?(String(values.reschedule_time).length===5?String(values.reschedule_time)+':00':String(values.reschedule_time)):null;
    const targetExisting=isRescheduled?agendaEntries.find(x=>x.agenda_date===targetDate&&x.time_slot?.slice(0,5)===targetTime.slice(0,5)):null;
    const linkedTarget=targetExisting&&existing&&targetExisting.origin_entry_id===existing.id?targetExisting:null;
    const previousLinkedTarget=existing?agendaEntries.find(x=>x.origin_entry_id===existing.id):null;
    if(targetExisting&&!linkedTarget) throw new Error('Já existe outro agendamento nessa data e horário. Escolha outro horário para não substituir o compromisso existente.');
    const now=new Date().toISOString();
    const payload={agenda_date:date,time_slot:normalizedTime,event:values.event||'',host_id:values.host_id||'',text:values.text||'',status:nextStatus,reschedule_date:isRescheduled?targetDate:null,reschedule_time:isRescheduled?targetTime:null,reschedule_unconfirmed:nextStatus==='Remarcado'&&!!values.reschedule_unconfirmed,created_by:existing?.created_by||session.user.id,updated_at:now};
    let savedOriginal;
    if(existing){
      const result=await supabase.from('agenda_entries').update(payload).eq('id',existing.id).select().single();
      if(result.error) throw result.error;
      savedOriginal=result.data;
    }else{
      const result=await supabase.from('agenda_entries').insert(payload).select().single();
      if(result.error) throw result.error;
      savedOriginal=result.data;
    }
    let movedEntry=null;
    if(isRescheduled){
      const movedPayload={agenda_date:targetDate,time_slot:targetTime,event:payload.event,host_id:payload.host_id,text:payload.text,status:'Agendado',reschedule_date:null,reschedule_time:null,reschedule_unconfirmed:false,created_by:session.user.id,origin_entry_id:savedOriginal.id,updated_at:new Date().toISOString()};
      if(linkedTarget){
        const result=await supabase.from('agenda_entries').update(movedPayload).eq('id',linkedTarget.id).select().single();
        if(result.error) throw result.error;
        movedEntry=result.data;
      }else{
        const result=await supabase.from('agenda_entries').insert(movedPayload).select().single();
        if(result.error) throw result.error;
        movedEntry=result.data;
      }
    }
    const targetChanged=previousLinkedTarget&&(!movedEntry||previousLinkedTarget.id!==movedEntry.id);
    if(targetChanged){
      const removed=await supabase.from('agenda_entries').delete().eq('id',previousLinkedTarget.id);
      if(removed.error) throw removed.error;
    }
    setAgendaEntries(old=>[...old.filter(x=>x.id!==savedOriginal.id&&x.id!==movedEntry?.id&&x.id!==(targetChanged?previousLinkedTarget.id:null)),savedOriginal,...(movedEntry?[movedEntry]:[])].sort((a,b)=>(a.agenda_date+a.time_slot).localeCompare(b.agenda_date+b.time_slot)));
    await writeLog(existing?'Agenda editada':'Agenda publicada',date+' '+normalizedTime+' · '+(values.event||'Evento')+' · Anfitrião '+(values.host_id||'—')+(isRescheduled?' · Novo horário '+targetDate+' '+targetTime.slice(0,5):''),'agenda_entries',savedOriginal.id);
    return {original:savedOriginal,moved:movedEntry};
  };
  const saveDailySchedule=async(form)=>{if(!canManageDailySchedule)throw new Error('Sem permissão.');const payload={schedule_date:today(),category:form.category,event_name:form.event_name.trim(),event_time:form.event_time,created_by:form.created_by||session.user.id,updated_by:session.user.id,updated_at:new Date().toISOString()};const q=form.id?supabase.from('daily_schedule_items').update(payload).eq('id',form.id):supabase.from('daily_schedule_items').insert(payload);const {error}=await q;if(error)throw error;await writeLog(form.id?'Cronograma editado':'Cronograma publicado',payload.category+' · '+payload.event_name+' · '+payload.event_time,'daily_schedule_items',form.id);setModal(null);await loadData();notify('Cronograma salvo.');};
  const addDailyDraftItem=()=>{const name=dailyDraftName.trim();if(!name||!dailyDraftTime)return notify('Informe o nome do evento e o horário.');setDailyDraft(old=>[...(old||[]),{event_name:name,event_time:dailyDraftTime,category:dailyDraftCategory}].sort((a,b)=>a.event_time.localeCompare(b.event_time)));setDailyDraftName('');};
  const beginDailyScheduleEdit=()=>{setDailyDraft(dailySchedule.map(x=>({...x})));setDailyDraftName('');};
  const cancelDailyScheduleEdit=()=>{setDailyDraft(null);setDailyDraftName('');};
  const renderDailyScheduleImage=async(items)=>{
    const img=new Image();img.src='/cronograma-template.png';await img.decode();
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,1600,900);
    const categories=[{key:'EVENTOS',x:67,w:465},{key:'PVP',x:572,w:465},{key:'ENTRETENIMENTO',x:1075,w:465}];
    const condensedFont=size=>`900 ${size}px Impact, "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
    const wrapText=(text,maxWidth,font)=>{ctx.font=font;const words=String(text||'').trim().split(/\s+/).filter(Boolean);const lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=maxWidth||!line){line=test;}else{lines.push(line);line=word;}}if(line)lines.push(line);return lines;};
    for(const col of categories){
      const rows=items.filter(x=>x.category===col.key).sort((a,b)=>String(a.event_time||'').localeCompare(String(b.event_time||'')));
      if(!rows.length)continue;
      const contentTop=350;
      const contentHeight=280;
      const rowHeight=Math.min(44,contentHeight/rows.length);
      const fontSize=Math.max(24,Math.min(31,rowHeight*.72));
      rows.forEach((item,index)=>{
        const centerY=contentTop+rowHeight*index+rowHeight/2;
        const time=String(item.event_time||'').slice(0,5);
        const event=String(item.event_name||'').toLocaleUpperCase('pt-BR');
        ctx.save();ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=3;
        ctx.textBaseline='middle';ctx.textAlign='left';
        ctx.font=condensedFont(Math.max(22,fontSize-2));
        const timeX=col.x+66;
        ctx.fillText(time,timeX,centerY,58);
        const eventX=col.x+136;const eventWidth=col.w-150;
        const eventFont=condensedFont(fontSize);
        let lines=wrapText(event,eventWidth-8,eventFont);
        if(lines.length>2){lines=[lines[0],lines.slice(1).join(' ')];}
        ctx.font=eventFont;
        const lineHeight=Math.min(36,fontSize+3);
        const startY=centerY-((lines.length-1)*lineHeight)/2;
        lines.forEach((line,lineIndex)=>ctx.fillText(line,eventX,startY+lineIndex*lineHeight,eventWidth-8));
        ctx.restore();
      });
    }
    const drawHighlight=(time,x,width)=>{
      const matches=items.filter(v=>String(v.event_time||'').slice(0,5)===time);
      if(!matches.length)return;
      let size=matches.length>1?31:43;
      const maxWidth=width-28;
      const labels=matches.map(v=>time+' · '+String(v.event_name||'')+(matches.length>1?' · '+String(v.category||''):'')); 
      let lines=[];
      while(size>=20){
        const font='900 '+size+'px Arial';lines=labels.flatMap(label=>wrapText(label,maxWidth,font));
        if(lines.length<=4)break;size-=2;
      }
      ctx.save();ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=5;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=condensedFont(size);
      const lineHeight=size+7;const startY=805-((lines.length-1)*lineHeight)/2;
      lines.forEach((line,index)=>ctx.fillText(line,x+width/2,startY+index*lineHeight,maxWidth));
      ctx.restore();
    };
    drawHighlight('21:00',210,520);drawHighlight('22:00',900,560);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar a imagem do cronograma.')),'image/png'));
  };
  useEffect(()=>{if(!dailySchedule.length||!session?.user||!profile)return;let active=true;(async()=>{try{const imageBlob=await renderDailyScheduleImage(dailySchedule);const {error}=await supabase.storage.from('lisboa-media').upload('cronogramas/'+today()+'.png',imageBlob,{upsert:true,contentType:'image/png'});if(error)throw error;if(active)setDailyImageVersion(v=>v+1);}catch(e){console.warn('Não foi possível atualizar a formatação do cronograma já publicado:',errText(e));}})();return()=>{active=false;};},[dailySchedule,session?.user?.id,profile?.user_id]);
  const postDailySchedule=async()=>{if(!canManageDailySchedule)return notify('Sem permissão.');const items=dailyDraft||[];if(!items.length)return notify('Adicione pelo menos um evento antes de finalizar.');setBusy(true);try{const imageBlob=await renderDailyScheduleImage(items);const existingIds=items.filter(x=>x.id).map(x=>x.id);for(const item of items){const payload={schedule_date:today(),category:item.category,event_name:item.event_name.trim(),event_time:item.event_time,created_by:item.created_by||session.user.id,updated_by:session.user.id,updated_at:new Date().toISOString()};const result=item.id?await supabase.from('daily_schedule_items').update(payload).eq('id',item.id):await supabase.from('daily_schedule_items').insert(payload);if(result.error)throw result.error;}const removed=dailySchedule.filter(x=>!existingIds.includes(x.id));if(removed.length){const {error}=await supabase.from('daily_schedule_items').delete().in('id',removed.map(x=>x.id));if(error)throw error;}const imagePath='cronogramas/'+today()+'.png';const {error:imageError}=await supabase.storage.from('lisboa-media').upload(imagePath,imageBlob,{upsert:true,contentType:'image/png'});if(imageError)throw imageError;await writeLog(dailySchedule.length?'Cronograma atualizado':'Cronograma publicado',items.length+' item(ns) no cronograma','daily_schedule_items');setDailyDraft(null);setDailyImageVersion(v=>v+1);await loadData();notify('Cronograma publicado e imagem gerada com sucesso.');}catch(e){notify(errText(e));}finally{setBusy(false);}};
  const downloadDailyScheduleImage=()=>{const url=supabase.storage.from('lisboa-media').getPublicUrl('cronogramas/'+today()+'.png').data.publicUrl;const a=document.createElement('a');a.href=url;a.download='lisboa-eventos-cronograma-'+today()+'.png';a.target='_blank';document.body.appendChild(a);a.click();a.remove();};
  const copyDailyScheduleImage=async()=>{try{const url=supabase.storage.from('lisboa-media').getPublicUrl('cronogramas/'+today()+'.png').data.publicUrl;const response=await fetch(url);if(!response.ok)throw new Error('Não foi possível acessar a imagem publicada.');const blob=await response.blob();if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Seu navegador não permite copiar imagens. Use Baixar imagem.');await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]);notify('Imagem copiada.');}catch(e){notify(errText(e));}};
  const deleteDailySchedulePost=async()=>{if(!canManageDailySchedule||!confirm('Excluir o cronograma de hoje e a imagem publicada?'))return;setBusy(true);try{const {error}=await supabase.from('daily_schedule_items').delete().eq('schedule_date',today());if(error)throw error;const {error:storageError}=await supabase.storage.from('lisboa-media').remove(['cronogramas/'+today()+'.png']);if(storageError)console.warn('Imagem não removida:',storageError.message);await writeLog('Cronograma excluído','Cronograma e imagem do dia','daily_schedule_items');setDailyDraft(null);setDailyImageVersion(v=>v+1);await loadData();notify('Cronograma e imagem excluídos.');}catch(e){notify(errText(e));}finally{setBusy(false);}};
  const saveAvailability = async (form) => {
    const absent=Boolean(form.is_absent);
    const payload={user_id:session.user.id,available_date:form.available_date,start_time:absent?null:(form.start_time||null),end_time:absent?null:(form.end_time||null),notes:absent?(form.absence_reason||''):(form.notes||null),is_absent:absent,absence_reason:absent?(form.absence_reason||''):null,absence_end_date:absent?(form.absence_end_date||null):null};
    if(absent&&!payload.absence_reason.trim())throw new Error('Informe o motivo da ausência.');
    if(absent&&!payload.absence_end_date)throw new Error('Informe a data de retorno.');
    if(absent&&payload.absence_end_date<=payload.available_date)throw new Error('A data de retorno precisa ser posterior ao início da ausência.');
    const {error}=await supabase.from('availability').insert(payload);if(error)throw error;
    await writeLog(absent?'Ausência registrada':'Disponibilidade publicada',payload.available_date+(absent?' até o retorno em '+payload.absence_end_date+' · '+payload.absence_reason:''),'availability');
    setModal(null);await loadData();
    const awayNow=absent&&payload.available_date<=today()&&payload.absence_end_date>today();
    if(awayNow){await supabase.auth.signOut();setSession(null);setProfile(null);setPage('Dashboard');setAuthMode('login');notify('Ausência registrada. Seu status foi alterado para Afastado até a data de retorno.');}
    else notify(absent?'Ausência registrada.':'Disponibilidade publicada.');
  };
  const canDeleteAvailability = (row) => {
    if(row.user_id===session.user.id) return true;
    if(!['Responsável','Responsável Geral'].includes(profile?.role)) return false;
    const target=members.find(m=>m.user_id===row.user_id);
    return profile.role==='Responsável Geral' || target?.role!=='Responsável Geral';
  };
  const deleteAvailability = async (row) => {
    if(!canDeleteAvailability(row)) return notify('Você não tem permissão para excluir esta escala.');
    const { error } = await supabase.from('availability').delete().eq('id', row.id);
    if (error) return notify(errText(error));
    await writeLog('Disponibilidade/ausência excluída','Registro de '+(members.find(m=>m.user_id===row.user_id)?.name||'membro'),'availability',row.id);
    await loadData(); notify('Registro removido.');
  };
  const saveDailyShift = async (form) => {
    if(!canManageDailySchedule) throw new Error('Somente Supervisor, Responsável e Responsável Geral podem criar escalas.');
    const memberIds=[...new Set(form.member_ids||[])];
    if(memberIds.length<1||memberIds.length>4) throw new Error('Selecione de 1 a 4 membros.');
    const {error}=await supabase.rpc('create_daily_staff_shift',{p_time:form.start_time,p_member_ids:memberIds});
    if(error) throw error;
    setModal(null);await loadData();notify('Escala criada com sucesso.');
  };

  const approveMember = async (member) => { const {error}=await supabase.rpc('approve_staff_member',{p_user_id:member.user_id}); if(error) return notify(errText(error)); await writeLog('Cadastro aprovado',member.name,'staff_profiles',member.user_id); await loadData(); notify('Membro aprovado e acesso liberado.'); };

  const removeMember = async (member) => { if(!canRemoveMembers) return notify('Somente o Responsável Geral pode remover membros.'); if(!confirm(`Remover definitivamente o membro ${member.name}? Esta ação não pode ser desfeita.`)) return; const {error}=await supabase.rpc('delete_staff_member',{p_user_id:member.user_id}); if(error) return notify(errText(error)); await loadData(); notify('Membro removido.'); };

  const saveMember = async (form) => {
    const original=members.find(m=>m.user_id===form.user_id);
    if(!original) throw new Error('Membro não encontrado.');
    if(form.mode==='role'){
      if(!canManageRoles) throw new Error('Sem permissão para alterar cargos.');
      const {error}=await supabase.rpc('update_staff_role',{p_user_id:form.user_id,p_role:form.role});
      if(error) throw error;
      if(original.role!==form.role) await writeLog('Cargo alterado','Cadastro de '+original.name,'staff_profiles',form.user_id);
    } else {
      if(!canEditMemberData) throw new Error('Sem permissão para editar dados.');
      const fields=[
        ['ID','staff_id'],['Nome','name'],['Discord','discord'],['WhatsApp','whatsapp'],
        ['Telefone','phone'],['EQPG','eqpg'],['Status','status']
      ];
      const changed=fields.filter(([,key])=>String(original[key]??'')!==String(form[key]??''));
      const {error}=await supabase.rpc('update_staff_details',{p_user_id:form.user_id,p_staff_id:form.staff_id.trim(),p_name:form.name.trim(),p_discord:form.discord||null,p_whatsapp:form.whatsapp||null,p_phone:form.phone||null,p_eqpg:form.eqpg||null,p_status:form.status});
      if(error) throw error;
      for(const [label] of changed) await writeLog(label+' alterado','Cadastro de '+original.name,'staff_profiles',form.user_id);
    }
    setModal(null);await loadData();notify('Perfil atualizado.');
  };
  const saveAvatar = async (file) => {if(!file)return;const path=await uploadMedia(file,'avatar');const {error}=await supabase.from('staff_profiles').update({avatar_url:path}).eq('user_id',session.user.id);if(error)throw error;await loadProfile(session.user);await writeLog('Foto de perfil alterada','Cadastro de '+profile.name,'staff_profiles',session.user.id);notify('Foto atualizada.');};
  const saveOwnProfile = async (form) => {
    const staffId=String(form.staff_id||'').trim(), name=String(form.name||'').trim();
    if(!staffId||!name) throw new Error('Nome e ID são obrigatórios.');
    if(form.password) {
      if(String(form.password).length<8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
      if(form.password!==form.confirm_password) throw new Error('As senhas não coincidem.');
    }
    const original=profile;
    const changes=[
      ['Nome','name',name],['ID','staff_id',staffId],['Discord','discord',form.discord||null],
      ['Telefone','phone',form.phone||null],['EQPG','eqpg',form.eqpg||null]
    ].filter(([,key,value])=>String(original[key]??'')!==String(value??''));
    const {error:profileError}=await supabase.rpc('update_own_staff_profile',{p_staff_id:staffId,p_name:name,p_discord:form.discord||null,p_phone:form.phone||null,p_eqpg:form.eqpg||null});
    if(profileError) throw profileError;
    for(const [label] of changes) await writeLog(label+' alterado','Cadastro de '+original.name,'staff_profiles',session.user.id);

    const authChanges={};
    const nextEmail=String(form.email||'').trim();
    const emailChanged=!!nextEmail && nextEmail.toLowerCase()!==String(session.user.email||'').toLowerCase();
    if(emailChanged) authChanges.email=nextEmail;
    if(form.password) authChanges.password=form.password;
    let emailPending=false;
    if(Object.keys(authChanges).length){
      const {data,error}=await supabase.auth.updateUser(authChanges);
      if(error) throw error;
      emailPending=!!authChanges.email;
      if(data?.user) setSession(current=>current?{...current,user:data.user}:current);
      if(emailChanged) await writeLog('E-mail alterado','Cadastro de '+original.name,'staff_profiles',session.user.id);
      if(form.password) await writeLog('Senha alterada','Cadastro de '+original.name,'staff_profiles',session.user.id);
    }
    await loadProfile(session.user);
    setModal(null);
    notify(emailPending?'Dados salvos. Confirme a alteração do e-mail pela mensagem enviada pelo Supabase.':'Cadastro atualizado com sucesso.');
  };
  const saveMemberPassword = async (form) => {
    if(profile?.role!=='Responsável Geral') throw new Error('Apenas o Responsável Geral pode redefinir senhas.');
    if(!form.user_id) throw new Error('Selecione um membro.');
    if(String(form.password||'').length<8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
    if(form.password!==form.confirm_password) throw new Error('As senhas não coincidem.');
    const {data,error}=await supabase.functions.invoke('admin-set-member-password',{body:{user_id:form.user_id,password:form.password}});
    if(error) {
      let message=error.message;
      try { const body=await error.context?.json(); if(body?.error) message=body.error; } catch {}
      throw new Error(message||'Não foi possível redefinir a senha.');
    }
    if(data?.error) throw new Error(data.error);
    const target=members.find(m=>m.user_id===form.user_id);
    setModal(null); await loadData();
    notify('Senha redefinida com sucesso para '+(target?.name||'o membro')+'.');
  };
  const markAbsence = async (scheduleId,checked,reason='') => {const {error}=await supabase.rpc('set_my_schedule_absence',{p_schedule_id:scheduleId,p_is_absent:checked,p_reason:reason});if(error)notify(errText(error));else{await loadData();await loadProfile(session.user);notify(checked?'Ausência marcada. Status Afastado.':'Ausência removida.');}};
  const roleOrder={'Responsável Geral':0,'Responsável':1,'Supervisor':2,'Especialista':3,'Analista':4,'Aprendiz':5,'Treinamento':6};
  const filteredMembers = useMemo(() => members.filter(m => `${m.name} ${m.staff_id} ${m.role} ${m.eqpg || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(roleOrder[a.role]??99)-(roleOrder[b.role]??99)||a.name.localeCompare(b.name)), [members, search]);
  const filteredEvents = useMemo(() => events.filter(e => `${e.name} ${e.category || ''} ${e.status || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.start_time||'').localeCompare(String(a.start_time||''))||new Date(b.created_at||0)-new Date(a.created_at||0)), [events, search]); const eventPages=Math.max(1,Math.ceil(filteredEvents.length/5)); const paginatedEvents=filteredEvents.slice(eventPage*5,(eventPage+1)*5);
  const weekStart=new Date();weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));weekStart.setHours(0,0,0,0);const weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+7);
  const weeklyEvents=events.filter(e=>e.status==='Concluído'&&e.event_date&&new Date(e.event_date+'T00:00:00')>=weekStart&&new Date(e.event_date+'T00:00:00')<weekEnd);
  const isLateGame=e=>String(e.name||'').toLowerCase().replace(/[^a-z]/g,'').includes('lategame');
  const eventCountForMember=(id,start=null,end=null,rankingOnly=false)=>{const startDate=start?(start instanceof Date?start.toLocaleDateString('en-CA'):start):null;const endDate=end?(end instanceof Date?end.toLocaleDateString('en-CA'):end):null;return events.filter(e=>e.status==='Concluído'&&((e.staff_ids||[]).includes(id)||e.responsible_id===id)&&(!startDate||e.event_date>=startDate)&&(!endDate||e.event_date<endDate)).reduce((sum,e)=>sum+(isLateGame(e)?2:1),0) + eventCredits.filter(x=>x.user_id===id&&(!rankingOnly||x.include_in_ranking!==false)&&(!start||x.created_at>=start.toISOString())&&(!end||x.created_at<end.toISOString())).reduce((sum,x)=>sum+x.quantity,0);};
  const memberEventCount=id=>eventCountForMember(id);
  const handleMemberAction=async(action,member)=>{if(action==='role'){setModal({type:'member',data:{...member,mode:'role'}});return;}if(action==='events'){setModal({type:'event_credit',data:{user_id:member.user_id,member_name:member.name,quantity:1,operation:'add',include_in_ranking:true}});return;}if(action==='remove'){setModal(null);await removeMember(member);return;}if(action==='telagem'||action==='dev'){const tag=action==='telagem'?'Telador':'DEV';try{const {error}=await supabase.rpc('set_staff_tag',{p_user_id:member.user_id,p_tag:tag,p_enabled:!member.tags?.includes(tag)});if(error)throw error;await loadData();notify('Tag '+tag+' atualizada.');}catch(e){notify(errText(e));}}};
  const currentAvatar=profile?.avatar_url?supabase.storage.from('lisboa-media').getPublicUrl(profile.avatar_url).data.publicUrl:null;

  if (!isSupabaseConfigured) return <SetupError />;
  if (authMode === 'update-password') return <main className="login-wrap"><form className="login-card" onSubmit={updatePassword}><div className="login-logo"><img src="/lisboa-eventos-logo.png" alt="Logo Lisboa Eventos"/></div><p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>CRIAR NOVA <span>SENHA</span></h1><p className="muted">Defina uma nova senha para sua conta do LISBOA EVENTOS.</p><label>Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} required /></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} required /></label>{recoveryError && <p className="error">{recoveryError}</p>}<button className="primary full" disabled={loading}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button></form></main>;
  if (authMode === 'signup') return <main className="login-wrap"><form className="login-card" onSubmit={requestSignup}><div className="crown">♛</div><p className="eyebrow">SOLICITAÇÃO DE ACESSO</p><h1>CADASTRAR-<span>SE</span></h1><p className="muted">Preencha seus dados. A administração analisará e aprovará seu acesso antes de liberar a entrada no sistema.</p><label>Nome<input type="text" autoComplete="name" value={signupName} onChange={e=>setSignupName(e.target.value)} required /></label><label>ID<input type="text" value={signupId} onChange={e=>setSignupId(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="new-password" minLength={8} value={signupPassword} onChange={e=>setSignupPassword(e.target.value)} required /></label><label>Discord<input type="text" value={signupDiscord} onChange={e=>setSignupDiscord(e.target.value)} placeholder="Usuário ou ID do Discord" /></label><label>E-mail<input type="email" autoComplete="email" value={signupEmail} onChange={e=>setSignupEmail(e.target.value)} required /></label><label>Telefone<input type="tel" autoComplete="tel" value={signupPhone} onChange={e=>setSignupPhone(e.target.value)} required /></label>{signupError && <p className="error">{signupError}</p>}<button className="primary full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitação'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('login');setSignupError('')}}>Voltar ao login</button><p className="tiny">O cadastro não libera acesso automaticamente. Seu cargo inicial será Treinamento e seu status ficará Pendente.</p></form></main>;
  if (authMode === 'forgot-password') return <main className="login-wrap"><form className="login-card" onSubmit={requestPasswordReset}><div className="crown">♛</div><p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>ESQUECI A <span>SENHA</span></h1><p className="muted">Informe o e-mail cadastrado na sua conta. Enviaremos um link para criar uma nova senha.</p><label>E-mail<input type="email" autoComplete="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required /></label>{recoveryError && <p className="error">{recoveryError}</p>}{recoveryMessage && <p className="notice">{recoveryMessage}</p>}<button className="primary full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar link de recuperação'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('login');setRecoveryError('');setRecoveryMessage('')}}>Voltar ao login</button></form></main>;
  if (loading && !session) return <div className="center-screen"><div className="spinner"/><p>Conectando ao LISBOA EVENTOS…</p></div>;
  if (!session || !profile) return <main className="login-wrap"><form className="login-card" onSubmit={signIn}><div className="crown">♛</div><p className="eyebrow">ACESSO RESTRITO</p><h1>LISBOA <span>EVENTOS</span></h1><p className="muted">Entre com o e-mail e a senha da sua conta autorizada.</p><label>E-mail<input type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required /></label>{loginError && <p className="error">{loginError}</p>}{loginNotice && <p className="notice">{loginNotice}</p>}<button className="primary full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('forgot-password');setLoginError('');setRecoveryError('');setRecoveryMessage('')}}>Esqueci minha senha</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('signup');setSignupError('');setSignupMessage('')}}>Cadastrar-se</button><p className="tiny">O acesso só é liberado após aprovação da administração.</p></form></main>;

  const canUseTelagem=Boolean(profile?.role==='Responsável Geral'||isDev||profile?.tags?.includes('Telador'));
  const nav = ['Dashboard', 'Avisos', 'Eventos', 'Registrar Eventos', ...(canUseTelagem?['Registro de Telagem']:[]), 'Sugestões', ...(canManageDailySchedule?['Cronograma']:[]),'Ranking de Eventos','Metas','Escala do Dia',...(canViewTeam?['Equipe']:[]),'Perfil','Agenda', ...(canViewAdmin ? ['Painel ADM'] : [])];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><img className="brand-logo" src="/lisboa-eventos-logo.png" alt="Logo Lisboa Eventos"/><div><b>LISBOA</b><small>EVENTOS</small></div></div><div className="side-label">MENU PRINCIPAL</div><nav>{nav.map(n=><button key={n} className={page===n?'nav-active':''} onClick={()=>{setPage(n);setSearch('')}}><span>{({'Dashboard':'◈','Avisos':'📢','Eventos':'🎉','Registrar Eventos':'◆','Registro de Telagem':'👁️‍🗨️','Sugestões':'💡','Cronograma':'▦','Ranking de Eventos':'★','Metas':'◎','Escala do Dia':'◷','Membros':'♙','Equipe':'♙','Perfil':'◉','Agenda':'▦','Painel ADM':'♜'})[n]}</span>{n}</button>)}</nav><div className="sidebar-bottom"><div className="avatar">{currentAvatar?<img src={currentAvatar} alt="Foto"/>:profile.name?.slice(0,1)?.toUpperCase()}</div><div className="user-meta"><b>{profile.name} {profile.tags?.includes('DEV')?'⚙️':''} {profile.tags?.includes('Telador')?'👁️‍🗨️':''}</b><small>{profile.role}</small></div><button className="logout" title="Sair" onClick={signOut}>↪</button></div></aside>
    <main className="main-area"><header className="topbar"><div><p className="eyebrow">LISBOA EVENTOS / PAINEL</p><h1>{page}</h1></div><div className="top-actions"><span className="online-dot">● Conectado</span><button className="secondary" onClick={loadData}>{busy?'Atualizando…':'↻ Atualizar'}</button></div></header>
      {page==='Dashboard' && <><section className="panel"><div className="panel-head"><h2>Pódio do dia anterior</h2></div><Podium rows={rankMembersForDay(members,events,eventCredits,new Date(Date.now()-86400000)).slice(0,3)}/><button className="primary" onClick={()=>setPage('Cronograma')}>Acompanhar Cronograma</button></section>
        {(()=>{const date=today();const todays=agendaEntries.filter(x=>x.agenda_date===date).sort((a,b)=>a.time_slot.localeCompare(b.time_slot));const overdue=canAccessAgenda?agendaEntries.filter(x=>x.agenda_date===date&&x.status==='Agendado'&&new Date(date+'T'+x.time_slot.slice(0,8)).getTime()+3600000<=clockNow.getTime()).sort((a,b)=>a.time_slot.localeCompare(b.time_slot)):[];return <>{todays.length>0&&<section className="panel agenda-announcement agenda-announcement-public"><div className="agenda-announcement-title">📅 Aviso de agenda para hoje</div><p>Atenção, equipe! Hoje temos compromissos programados na Agenda. Confira os horários e as orientações para que tudo aconteça conforme o planejado.</p><div className="agenda-announcement-items">{todays.map(x=><div key={x.id}><b>{x.time_slot.slice(0,5)} · {x.event||'Agendamento'}</b><span>Anfitrião: {x.host_id||'—'}</span><small>Status: {x.status||'Agendado'} · {x.text}</small></div>)}</div><button className="small-button" onClick={()=>{setPage('Agenda');setAgendaMonth(new Date(date+'T00:00:00'));setSelectedAgendaDate(date);}}>Ver agenda de hoje</button></section>}{overdue.length>0&&<section className="panel agenda-announcement agenda-announcement-managers"><div className="agenda-announcement-title">⏰ Atualização de status pendente</div><p>Supervisor, Responsável e Responsável Geral: os horários abaixo já ultrapassaram uma hora. Por favor, atualizem o status na Agenda para manter os registros da equipe em dia.</p><div className="agenda-announcement-items">{overdue.map(x=><div key={x.id}><b>{x.time_slot.slice(0,5)} · {x.event||'Agendamento'}</b><span>Anfitrião: {x.host_id||'—'}</span></div>)}</div><button className="small-button" onClick={()=>setPage('Agenda')}>Atualizar status na Agenda</button></section>}</>})()}
</>}
      {page==='Registrar Eventos' && canRegister && <section className="panel"><div className="panel-head"><div><h2>Registrar eventos</h2><p>Preencha os mesmos dados do registro de evento.</p></div><button className="primary" onClick={()=>setModal({type:'event',data:{event_date:today(),staff_ids:[]}})}>＋ Registrar evento</button></div></section>}
      {page==='Eventos' && <section className="panel"><div className="panel-head"><div><h2>Eventos registrados</h2><p>Histórico completo dos eventos cadastrados.</p></div></div><input className="search" placeholder="Buscar evento…" value={search} onChange={e=>{setSearch(e.target.value);setEventPage(0)}}/><EventsTable rows={paginatedEvents} onEdit={()=>{}} onDelete={deleteEvent} admin={profile.role==='Responsável Geral'||isDev}/>{eventPages>1&&<div className="log-pagination"><button className="secondary" disabled={eventPage===0} onClick={()=>setEventPage(p=>p-1)}>Anterior</button><span>Página {eventPage+1} de {eventPages}</span><button className="secondary" disabled={eventPage>=eventPages-1} onClick={()=>setEventPage(p=>p+1)}>Próxima</button></div>}</section>}
      {page==='Registro de Telagem' && canUseTelagem && <section className="panel"><div className="panel-head"><div><h2>Registro de Telagem</h2><p>Cada registro válido acrescenta 5 eventos ao seu total.</p></div></div><form className="form-grid" onSubmit={async e=>{e.preventDefault();try{const {error}=await supabase.rpc('register_telagem',{p_staff_user_id:session.user.id,p_player_name:telagemDraft.player_name,p_discord:telagemDraft.discord,p_event_name:telagemDraft.event_name,p_occurred_at:new Date(telagemDraft.occurred_at).toISOString()});if(error)throw error;setTelagemDraft({player_name:'',discord:'',event_name:'',occurred_at:''});await loadData();notify('Telagem registrada. +5 eventos adicionados.')}catch(err){notify(errText(err))}}}><label>STAFF<input value={profile.name} readOnly/></label><label>JOGADOR<input required value={telagemDraft.player_name} onChange={e=>setTelagemDraft(v=>({...v,player_name:e.target.value}))}/></label><label>DISCORD<input required value={telagemDraft.discord} onChange={e=>setTelagemDraft(v=>({...v,discord:e.target.value}))}/></label><label>EVENTO<input required value={telagemDraft.event_name} onChange={e=>setTelagemDraft(v=>({...v,event_name:e.target.value}))}/></label><label>DATA / HORA<input type="datetime-local" required value={telagemDraft.occurred_at} onChange={e=>setTelagemDraft(v=>({...v,occurred_at:e.target.value}))}/></label><button className="primary">Registrar Telagem</button></form><div className="table-wrap"><table><thead><tr><th>Staff</th><th>Jogador</th><th>Discord</th><th>Evento</th><th>Data/Hora</th></tr></thead><tbody>{telagemRows.map(t=><tr key={t.id}><td>{members.find(m=>m.user_id===t.staff_user_id)?.name||'—'}</td><td>{t.player_name}</td><td>{t.discord}</td><td>{t.event_name}</td><td>{new Date(t.occurred_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></section>}
      {page==='Sugestões' && <section className="panel"><div className="panel-head"><div><h2>Sugestões</h2><p>Publique ideias e acompanhe a análise da equipe.</p></div></div><form className="form-grid" onSubmit={async e=>{e.preventDefault();try{const {error}=await supabase.from('suggestions').insert({author_id:session.user.id,title:suggestionDraft.title.trim(),content:suggestionDraft.content.trim(),status:'Em Análise'});if(error)throw error;setSuggestionDraft({title:'',content:''});setSuggestionPage(0);await loadData();notify('Sugestão publicada.')}catch(err){notify(errText(err))}}}><label>Título<input required value={suggestionDraft.title} onChange={e=>setSuggestionDraft(v=>({...v,title:e.target.value}))}/></label><label className="wide">Descrição<textarea required rows="4" value={suggestionDraft.content} onChange={e=>setSuggestionDraft(v=>({...v,content:e.target.value}))}/></label><button className="primary">Publicar sugestão</button></form><div className="goal-list">{suggestions.slice(suggestionPage*10,(suggestionPage+1)*10).map(s=><article className="goal-card" key={s.id}><div className="panel-head"><h3>{s.title}</h3><span className={'status '+({'Em Análise':'info','Aprovado':'cyan','Reprovado':'rejected','Entregue':'delivered'}[s.status]||'')}>{s.status}</span></div><p>{s.content}</p><small>{members.find(m=>m.user_id===s.author_id)?.name||'Membro'} · {new Date(s.created_at).toLocaleString('pt-BR')}</small>{s.rejection_reason&&<p><b>Motivo:</b> {s.rejection_reason}</p>}<div className="row-actions">{(s.author_id===session.user.id||profile.role==='Responsável'||profile.role==='Responsável Geral'||isDev)&&<button className="small-button" onClick={async()=>{setActiveSuggestion(s);setChatMinimized(false);const {data,error}=await supabase.from('suggestion_messages').select('*').eq('suggestion_id',s.id).order('created_at');if(error)notify(errText(error));else setSuggestionMessages(data||[])}}>Chat</button>}{(profile.role==='Responsável'||profile.role==='Responsável Geral'||isDev)&&<select value={s.status} onChange={async e=>{const status=e.target.value;let reason=s.rejection_reason||'';if(status==='Reprovado')reason=window.prompt('Motivo da recusa (opcional):')||'';const {error}=await supabase.from('suggestions').update({status,rejection_reason:reason}).eq('id',s.id);if(error)notify(errText(error));else{setActiveSuggestion(current=>current?.id===s.id?{...current,status}:current);await loadData()}}}><option>Em Análise</option><option>Aprovado</option><option>Reprovado</option><option>Entregue</option></select>}</div></article>)}</div>{Math.ceil(suggestions.length/10)>1&&<div className="log-pagination"><button className="secondary" disabled={!suggestionPage} onClick={()=>setSuggestionPage(p=>p-1)}>Anterior</button><span>Página {suggestionPage+1} de {Math.ceil(suggestions.length/10)}</span><button className="secondary" disabled={(suggestionPage+1)*10>=suggestions.length} onClick={()=>setSuggestionPage(p=>p+1)}>Próxima</button></div>}{activeSuggestion&&<div className={'suggestion-chat-window'+(chatMinimized?' minimized':'')}><div className="suggestion-chat-head"><b>Chat · {activeSuggestion.title}</b><div><button type="button" className="small-button" onClick={()=>setChatMinimized(v=>!v)}>{chatMinimized?'Maximizar':'Minimizar'}</button><button type="button" className="small-button" onClick={()=>{setActiveSuggestion(null);setSuggestionMessages([]);setSuggestionMessageDraft('');setChatMinimized(false)}}>Fechar</button></div></div>{!chatMinimized&&<><div className="suggestion-chat-body">{suggestionMessages.map(m=><p className="suggestion-chat-message" key={m.id}><b>{members.find(x=>x.user_id===m.sender_id)?.name||'Membro'}:</b> {m.message} <small>{new Date(m.created_at).toLocaleString('pt-BR')}</small></p>)}<div ref={chatEndRef}/></div>{activeSuggestion.status==='Em Análise'&&<form className="suggestion-chat-compose" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.from('suggestion_messages').insert({suggestion_id:activeSuggestion.id,sender_id:session.user.id,message:suggestionMessageDraft.trim()});if(error)notify(errText(error));else{setSuggestionMessageDraft('');const {data}=await supabase.from('suggestion_messages').select('*').eq('suggestion_id',activeSuggestion.id).order('created_at');setSuggestionMessages(data||[])}}}><input required value={suggestionMessageDraft} onChange={e=>setSuggestionMessageDraft(e.target.value)} placeholder="Escreva uma mensagem"/><button className="primary">Enviar</button></form>}</>}</div>}</section>}
      {page==='Avisos' && <section className="panel"><div className="panel-head"><div><h2>Avisos</h2><p>Comunicados oficiais para toda a equipe.</p></div>{(['Responsável','Responsável Geral'].includes(profile.role)||isDev)&&<button className="primary" onClick={()=>setModal({type:'announcement',data:{title:'',content:''}})}>＋ Publicar aviso</button>}</div>{announcements.length===0?<Empty text="Nenhum aviso publicado."/>:<div className="announcement-list">{announcements.map(a=><article className="goal-card announcement-card" key={a.id}><span className="tag">AVISO</span>{a.title&&<h3>{a.title}</h3>}<div className="goal-description" dangerouslySetInnerHTML={{__html:safeGoalHtml(a.content||'')}}/>{a.image_path&&<img className="announcement-image" src={supabase.storage.from('lisboa-media').getPublicUrl(a.image_path).data.publicUrl} alt={a.title||'Imagem do aviso'}/>}<small className="announcement-meta">Publicado por {members.find(m=>m.user_id===a.created_by)?.name||'Equipe'} · {new Date(a.created_at).toLocaleString('pt-BR')}</small>{(['Responsável','Responsável Geral'].includes(profile.role)||isDev)&&<div className="row-actions"><button className="small-button danger-button" onClick={()=>deleteAnnouncement(a)}>Excluir aviso</button></div>}</article>)}</div>}</section>}
      {page==='Equipe' && canViewTeam && <section className="panel"><div className="panel-head"><div><h2>Equipe</h2></div></div><input className="search" placeholder="Buscar por nome, ID ou cargo…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="table-wrap"><table><thead><tr><th>MEMBRO</th><th>ID</th><th>CARGO</th><th>EVENTOS</th><th>STATUS</th>{canViewMemberDataButton&&<th>AÇÕES</th>}</tr></thead><tbody>{filteredMembers.map(m=><tr key={m.user_id}><td><div className="member-cell">{m.avatar_url?<img className="member-avatar" src={supabase.storage.from('lisboa-media').getPublicUrl(m.avatar_url).data.publicUrl} alt={'Foto de '+m.name}/>:<span className="member-avatar placeholder">{m.name?.slice(0,1)?.toUpperCase()}</span>}<b>{m.name} {m.tags?.includes('DEV')?'⚙️':''} {m.tags?.includes('Telador')?'👁️‍🗨️':''}</b></div></td><td>{m.staff_id}</td><td>{m.role}</td><td>{memberEventCount(m.user_id)}</td><td><span className={`status ${m.status==='Ativo'?'good':'bad'}`}>{m.status}</span></td>{canViewMemberDataButton&&<td><div className="row-actions">{canEditMemberData&&<button className="small-button" onClick={()=>setModal({type:'member',data:{...m,mode:'edit'}})}>Dados</button>}</div></td>}</tr>)}</tbody></table></div></section>}
      {page==='Metas' && <section className="panel"><div className="panel-head"><div><h2>Metas da equipe</h2></div>{isAdmin&&<button className="primary" onClick={()=>setModal({type:'goal',data:{target_quantity:1}})}>＋ Nova meta</button>}</div>{goals.length===0?<Empty text="Nenhuma meta cadastrada."/>:<div className="goal-list">{goals.map(g=><article className="goal-card" key={g.id}><span className="tag">META</span><h3>{g.title}</h3><div className="goal-description" dangerouslySetInnerHTML={{__html:safeGoalHtml(g.description||'')}}/>{g.responsible_id&&<p><b>Membro:</b> {members.find(m=>m.user_id===g.responsible_id)?.name||'Membro'}</p>}{g.responsible_id&&<p><b>Progresso:</b> {eventCountForMember(g.responsible_id,g.period_start?new Date(g.period_start+'T00:00:00'):null,g.period_end?new Date(new Date(g.period_end+'T00:00:00').getTime()+86400000):null)} / {g.target_quantity} eventos</p>}{isAdmin&&<div className="row-actions"><button className="small-button" onClick={()=>setModal({type:'goal',data:g})}>Editar</button><button className="small-button danger-button" onClick={()=>deleteGoal(g)}>Excluir</button></div>}</article>)}</div>}</section>}
      {page==='Cronograma' && <section className="panel cronograma-manager"><div className="panel-head"><div><h2>Cronograma do dia</h2><p>Adicione todos os eventos e finalize para gerar a imagem no template oficial.</p></div>{dailyDraft===null&&canManageDailySchedule&&<button className="primary" onClick={beginDailyScheduleEdit}>＋ POSTAR CRONOGRAMA</button>}</div>{dailyDraft!==null&&canManageDailySchedule&&<><div className="cronograma-form"><label>Evento<input value={dailyDraftName} onChange={e=>setDailyDraftName(e.target.value)} placeholder="Nome do evento"/></label><label>Horário<input type="time" value={dailyDraftTime} onChange={e=>setDailyDraftTime(e.target.value)}/></label><label>Tipo<select value={dailyDraftCategory} onChange={e=>setDailyDraftCategory(e.target.value)}><option>EVENTOS</option><option>PVP</option><option>ENTRETENIMENTO</option></select></label><button className="secondary" type="button" onClick={addDailyDraftItem}>Adicionar</button></div><div className="cronograma-draft-list">{dailyDraft.map((item,index)=><div key={item.id||index}><b>{item.event_time} · {item.event_name}</b><span>{item.category}</span><button className="small-button danger-button" onClick={()=>setDailyDraft(old=>old.filter((_,i)=>i!==index))}>Remover</button></div>)}</div><div className="row-actions"><button className="secondary" onClick={cancelDailyScheduleEdit}>Cancelar</button><button className="primary" disabled={busy||!dailyDraft.length} onClick={postDailySchedule}>{busy?'Gerando imagem…':'Finalizar e gerar imagem'}</button></div></>}{dailyDraft===null&&dailySchedule.length>0&&<><div className="cronograma-posted-head"><b>Cronograma publicado</b>{canManageDailySchedule&&<div className="row-actions"><button className="secondary" onClick={beginDailyScheduleEdit}>Editar cronograma</button><button className="small-button danger-button" onClick={deleteDailySchedulePost}>Excluir cronograma e imagem</button></div>}</div><div className="row-actions"><button className="secondary" onClick={copyDailyScheduleImage}>Copiar imagem</button><button className="secondary" onClick={downloadDailyScheduleImage}>Baixar imagem</button></div><img className="cronograma-generated-image" src={supabase.storage.from('lisboa-media').getPublicUrl('cronogramas/'+today()+'.png').data.publicUrl+'?v='+dailyImageVersion} alt="Cronograma do dia publicado"/></>}{dailyDraft===null&&dailySchedule.length===0&&<Empty text="Nenhum cronograma publicado hoje."/>}</section>}
      {page==='Escala do Dia' && <div className="two-col availability-layout">
        <section className="panel">
          <div className="panel-head"><div><h2>Disponibilidade</h2><p>Informe seus horários ou registre uma ausência.</p></div><button className="primary" onClick={()=>setModal({type:'availability',data:{available_date:today(),is_absent:false}})}>＋ Informar</button></div>
          <AvailabilityTable rows={availability.filter(a=>canEditMemberData||a.user_id===session.user.id)} members={members} canDelete={canDeleteAvailability} onDelete={deleteAvailability}/>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Escala</h2><p>Escalas do dia para toda a equipe.</p></div>{canManageDailySchedule&&<button className="primary" onClick={()=>setModal({type:'daily_shift',data:{start_time:'12:00',member_ids:[]}})}>＋ Criar</button>}</div>
          <DailyShiftTable rows={schedules.filter(s=>s.schedule_kind==='staff_shift'&&s.schedule_date===today()&&s.start_time&&new Date(s.schedule_date+'T'+s.start_time).getTime()+3600000>clockNow.getTime())} members={members}/>
        </section>
      </div>}
      {page==='Ranking de Eventos' && <section className="panel"><div className="panel-head"><div><h2>Ranking de Eventos</h2></div></div><div className="rank-tabs"><button className={rankingPeriod==='weekly'?'rank-tab active':'rank-tab'} onClick={()=>setRankingPeriod('weekly')}>Semanal</button><button className={rankingPeriod==='monthly'?'rank-tab active':'rank-tab'} onClick={()=>setRankingPeriod('monthly')}>Mensal</button></div>{(()=>{const start=rankingPeriod==='weekly'?weekStart:new Date(new Date().getFullYear(),new Date().getMonth(),1);const end=rankingPeriod==='weekly'?weekEnd:new Date(new Date().getFullYear(),new Date().getMonth()+1,1);const cutoff='2026-11-18';const startStr=start.toLocaleDateString('en-CA');const endStr=end.toLocaleDateString('en-CA');const count=id=>events.filter(e=>e.status==='Concluído'&&e.event_date>=cutoff&&e.event_date>=startStr&&e.event_date<endStr&&((e.staff_ids||[]).includes(id)||e.responsible_id===id)).reduce((sum,e)=>sum+(isLateGame(e)?2:1),0)+eventCredits.filter(x=>x.user_id===id&&x.include_in_ranking!==false&&x.created_at>=cutoff+'T00:00:00'&&x.created_at>=start.toISOString()&&x.created_at<end.toISOString()).reduce((sum,x)=>sum+x.quantity,0);const ranked=members.map(m=>({...m,count:count(m.user_id)})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count);return <><Podium rows={ranked}/></>})()}</section>}
      {page==='Agenda' && <section className="panel agenda-panel"><div className="panel-head"><h2>Agenda</h2></div><div className="agenda-calendar-head"><button className="secondary" onClick={()=>setAgendaMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button><strong>{agendaMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</strong><button className="secondary" onClick={()=>setAgendaMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button></div><div className="agenda-calendar"><div className="agenda-weekdays">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><b key={d}>{d}</b>)}</div>{Array.from({length:42},(_,i)=>{const first=new Date(agendaMonth.getFullYear(),agendaMonth.getMonth(),1);const day=new Date(first);day.setDate(first.getDate()-first.getDay()+i);const iso=day.toLocaleDateString('en-CA');return <button key={iso} className={'agenda-day'+(day.getMonth()===agendaMonth.getMonth()?'':' muted')+(selectedAgendaDate===iso?' selected':'')} onClick={()=>{setSelectedAgendaDate(iso);setAgendaSelectedTime('');}}>{day.getDate()}{agendaEntries.some(x=>x.agenda_date===iso&&(x.event||x.text||x.host_id))&&<i/>}</button>})}</div><div className="agenda-date-title">{new Date(selectedAgendaDate+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>{canAccessAgenda&&<><label className="agenda-time-picker">Horário<select value={agendaSelectedTime} onChange={e=>{const time=e.target.value;setAgendaSelectedTime(time);const found=agendaEntries.find(x=>x.agenda_date===selectedAgendaDate&&x.time_slot?.slice(0,5)===time);setAgendaDraft({event:found?.event||'',host_id:found?.host_id||'',text:found?.text||''});}}><option value="">Selecione um horário</option>{Array.from({length:48},(_,i)=>{const t=String(Math.floor(i/2)).padStart(2,'0')+':'+(i%2?'30':'00');return <option key={t} value={t}>{t}</option>})}</select></label>{agendaSelectedTime&&<div className="agenda-editor"><label>Evento<input value={agendaDraft.event} onChange={e=>setAgendaDraft(p=>({...p,event:e.target.value}))}/></label><label>Anfitrião<input value={agendaDraft.host_id} onChange={e=>setAgendaDraft(p=>({...p,host_id:e.target.value}))} placeholder="ID do jogador"/></label><label>Texto<textarea rows="4" value={agendaDraft.text} onChange={e=>setAgendaDraft(p=>({...p,text:e.target.value}))}/></label><button className="primary" disabled={agendaSaving} onClick={async()=>{setAgendaSaving(true);try{await saveAgendaEntry(selectedAgendaDate,agendaSelectedTime+':00',agendaDraft);setAgendaDraft({event:'',host_id:'',text:''});notify('Agendamento salvo com sucesso.');}catch(e){notify(errText(e));}finally{setAgendaSaving(false);}}}>{agendaSaving?'Salvando…':'Salvar agendamento'}</button></div>}</>}{agendaEntries.filter(x=>x.agenda_date===selectedAgendaDate&&(x.event||x.text||x.host_id)).sort((x,y)=>x.time_slot.localeCompare(y.time_slot)).map(x=><AgendaPublicEntry key={x.id} entry={x} canEdit={canAccessAgenda} onSave={saveAgendaEntry} onGoToReschedule={()=>{if(!x.reschedule_date)return;const d=new Date(x.reschedule_date+'T00:00:00');setAgendaMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelectedAgendaDate(x.reschedule_date);setAgendaSelectedTime(x.reschedule_time?.slice(0,5)||'');setPage('Agenda');}} onEdit={()=>{setAgendaSelectedTime(x.time_slot.slice(0,5));setAgendaDraft({event:x.event||'',host_id:x.host_id||'',text:x.text||''});}} onDelete={()=>deleteAgendaEntry(x)} notify={notify}/>)}</section>}
      {page==='Painel ADM' && canViewAdmin && <section className="panel"><div className="panel-head"><h2>Painel ADM</h2></div>{profile.role==='Responsável Geral'&&<section className="section-logs"><div className="panel-head"><div><h3>Gerenciamento de senhas</h3><p>Redefina imediatamente a senha de qualquer membro com cargo inferior.</p></div><button className="primary" onClick={()=>setModal({type:'admin_password',data:{user_id:'',password:'',confirm_password:''}})}>＋ Redefinir senha</button></div></section>}{canReadLogs&&<div className="admin-logs"><div className="log-category-tabs">{[{id:'events',label:'Registro de eventos'},{id:'participation',label:'Eventos'},{id:'profile_changes',label:'Atualização de cadastro'},{id:'members',label:'Equipe'},{id:'goals',label:'Metas'},{id:'schedules',label:'Cronograma'},{id:'availability',label:'Escala'},{id:'agenda',label:'Agenda'},{id:'telagem',label:'Registro de Telagem'},{id:'mystery_boxes',label:'Caixas Misteriosas'},{id:'wallets',label:'Chaves e Tokens'}].map(x=><button key={x.id} className={selectedLogCategory===x.id?'rank-tab active':'rank-tab'} onClick={()=>{setSelectedLogCategory(x.id);setLogPage(0)}}>{x.label}</button>)}</div>{selectedLogCategory==='events'&&<EventRegistrationLogs rows={eventRegistrationLogs}/>}{selectedLogCategory==='participation'&&<EventParticipationLogs rows={participationLogs} members={members}/>}{selectedLogCategory==='profile_changes'&&<SectionLogs rows={logs} types={['staff_profiles']} title="Atualização de cadastro"/>}{selectedLogCategory==='members'&&<SectionLogs rows={logs} types={['member_event_credits']} title="Equipe"/>}{selectedLogCategory==='goals'&&<SectionLogs rows={logs} types={['team_goals']} title="Metas"/>}{selectedLogCategory==='schedules'&&<SectionLogs rows={logs} types={['schedules','daily_schedule_items']} title="Cronograma"/>}{selectedLogCategory==='availability'&&<SectionLogs rows={logs} types={['availability','schedule_responses']} title="Escala"/>}{selectedLogCategory==='agenda'&&<SectionLogs rows={logs} types={['agenda_entries']} title="Agenda"/>}{selectedLogCategory==='telagem'&&<SectionLogs rows={logs} types={['telagem_records']} title="Registro de Telagem"/>}{selectedLogCategory==='mystery_boxes'&&<MysteryBoxAdminLogs rows={mysteryBoxLogs} members={members}/>}{selectedLogCategory==='wallets'&&<WalletTransactionsLog keys={keyTransactions} tokens={tokenTransactions} members={members}/>}</div>}</section>}
      {page==='Caixas Misteriosas'&&<section className="panel"><div className="panel-head"><div><h2>Caixas Misteriosas</h2><p>Uma compra de 5 caixas por semana, disponível somente aos sábados e domingos.</p></div><div className="wallet-mini">🔑 {keyTransactions.reduce((sum,x)=>sum+x.amount,0)} chaves</div></div><div className="mystery-box-grid">{[{type:'Bronze',cost:60},{type:'Prata',cost:100},{type:'Ouro',cost:160}].map(box=>{const available=boxInventory.filter(x=>x.box_type===box.type).reduce((sum,x)=>sum+x.remaining,0);return <article className="mystery-box-card" key={box.type}><div className={'mystery-box-art '+box.type.toLowerCase()} role="img" aria-label={'Baú '+box.type}/><h3>Caixa {box.type}</h3><p className="box-cost">{box.cost} chaves · 5 caixas</p><p className="box-available">Disponíveis: <b>{available}</b></p><button className="secondary" disabled={!mysteryBoxPurchaseOpen||hasWeeklyBoxPurchase} title={!mysteryBoxPurchaseOpen?'Disponível somente sábado e domingo':hasWeeklyBoxPurchase?'Você já comprou suas caixas nesta semana':'Comprar 5 caixas'} onClick={async()=>{try{await buyMysteryBoxes(box.type)}catch(e){notify(errText(e))}}}>{hasWeeklyBoxPurchase?'Compra semanal realizada':!mysteryBoxPurchaseOpen?'Disponível no fim de semana':'Comprar 5 caixas'}</button><button className="primary" disabled={available<1} onClick={async()=>{try{await openMysteryBox(box.type)}catch(e){notify(errText(e))}}}>Abrir caixa</button></article>})}</div>{lastBoxResult&&<div className="box-result"><h3>Resultado da abertura</h3><p><b>Caixa:</b> {lastBoxResult.box_type}</p><p><b>Drop:</b> {lastBoxResult.drop}</p><p>{lastBoxResult.drop==='Comum'?'Não foi dessa vez — a caixa foi consumida.':lastBoxResult.drop==='Incomum'?'Tente outra vez — você pode tentar novamente nesta mesma caixa.':lastBoxResult.drop==='Rara'?'+5 Tokens!':'+10 Tokens!'}</p><button className="secondary" onClick={()=>setLastBoxResult(null)}>Fechar resultado</button></div>}<section className="section-logs"><h3>Meu inventário</h3>{boxInventory.filter(x=>x.remaining>0).length?boxInventory.filter(x=>x.remaining>0).map(x=><p key={x.id}>Caixa {x.box_type}: {x.remaining} disponível(is)</p>):<p>Você ainda não possui caixas disponíveis.</p>}</section><section className="section-logs"><h3>Saldo de Tokens</h3><strong>🪙 {tokenTransactions.reduce((sum,x)=>sum+x.amount,0)} tokens</strong></section></section>}{page==='Perfil'&&<section className="panel"><div className="panel-head"><div><h2>Meu perfil</h2></div></div><div className="profile-row">{currentAvatar?<img className="profile-photo" src={currentAvatar} alt="Foto"/>:<div className="profile-photo placeholder">{profile.name?.slice(0,1)}</div>}<label className="primary upload-label">Alterar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{try{await saveAvatar(e.target.files?.[0]);}catch(err){notify(errText(err));}}}/></label></div><div className="wallet-strip"><div className="wallet-card"><span className="wallet-icon">🔑</span><div><small>CARTEIRA DE CHAVES</small><strong>{keyTransactions.reduce((sum,x)=>sum+x.amount,0)} <span>chaves</span></strong></div></div><button className="primary" onClick={()=>{setLastBoxResult(null);setPage('Caixas Misteriosas')}}>Usar</button></div><div className="stats"><Stat title="Eventos nesta semana" value={eventCountForMember(profile.user_id,weekStart,weekEnd)} hint="Semana atual"/><Stat title="Eventos neste mês" value={eventCountForMember(profile.user_id,new Date(new Date().getFullYear(),new Date().getMonth(),1),new Date(new Date().getFullYear(),new Date().getMonth()+1,1))} hint="Mês atual"/><Stat title="Eventos em geral" value={memberEventCount(profile.user_id)} hint="Histórico completo"/></div><div className="row-actions"><button className="primary" onClick={()=>setModal({type:'profile_edit',data:{name:profile.name||'',staff_id:profile.staff_id||'',discord:profile.discord||'',phone:profile.phone||'',eqpg:profile.eqpg||'',email:session.user.email||'',password:'',confirm_password:''}})}>Atualizar Cadastro</button></div><div className="profile-details"><p><b>Nome:</b> {profile.name}</p><p><b>ID:</b> {profile.staff_id}</p><p><b>Discord:</b> {profile.discord||'—'}</p><p><b>Telefone:</b> {profile.phone||'—'}</p><p><b>EQPG:</b> {profile.eqpg||'—'}</p><p><b>Cargo:</b> {profile.role}</p><p><b>Status:</b> {profile.status}</p></div></section>}<footer>© {new Date().getFullYear()} LISBOA EVENTOS · LISBOA EVENTOS</footer>
    </main>
    {modal&&<Modal modal={modal} close={()=>setModal(null)} members={members} session={session} currentRole={profile.role} isDev={isDev} onMemberAction={handleMemberAction} keys={keyTransactions} tokens={tokenTransactions} saveEvent={saveEvent} saveAnnouncement={saveAnnouncement} saveEventCredit={saveEventCredit} saveGoal={saveGoal} saveSchedule={saveSchedule} saveAvailability={saveAvailability} saveDailyShift={saveDailyShift} saveDailySchedule={saveDailySchedule} saveMember={saveMember} saveOwnProfile={saveOwnProfile} saveMemberPassword={saveMemberPassword} saveWalletAdjustment={saveWalletAdjustment} onWalletOpen={(member,walletType)=>setModal({type:'wallet_adjust',data:{user_id:member.user_id,member_name:member.name,wallet_type:walletType,operation:'add',quantity:1}})} notify={notify}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function RichEditor({value,onChange}){const ref=React.useRef(null);const [html,setHtml]=useState(value||'');useEffect(()=>{if(ref.current&&ref.current.innerHTML!==String(value||'')){ref.current.innerHTML=safeGoalHtml(value||'');setHtml(value||'')}},[value]);const run=(cmd,val=null)=>{ref.current?.focus();document.execCommand('styleWithCSS',false,true);document.execCommand(cmd,false,val);const next=ref.current?.innerHTML||'';setHtml(next);onChange(next)};return <div className="rich-editor wide"><div className="rich-toolbar"><button type="button" onClick={()=>run('bold')}><b>B</b></button><button type="button" onClick={()=>run('italic')}><i>I</i></button><button type="button" onClick={()=>run('underline')}><u>U</u></button><label>Cor<input aria-label="Cor do texto" type="color" defaultValue="#1d4ed8" onChange={e=>run('foreColor',e.target.value)}/></label><label>Tamanho<select defaultValue="3" onChange={e=>run('fontSize',e.target.value)}><option value="2">Pequeno</option><option value="3">Normal</option><option value="4">Grande</option><option value="5">Muito grande</option><option value="6">Destaque</option></select></label></div><div ref={ref} className="rich-content" contentEditable suppressContentEditableWarning onInput={e=>setHtml(e.currentTarget.innerHTML)} onBlur={()=>onChange(ref.current?.innerHTML||'')} dangerouslySetInnerHTML={{__html:safeGoalHtml(value)}}/></div>}
function Podium({rows}){if(!rows?.length)return <Empty text="Ainda não há eventos contabilizados para esse período."/>;const medals=['🥇','🥈','🥉'];return <><div className="podium-grid">{rows.slice(0,3).map((m,i)=><div className={'podium-card place-'+(i+1)} key={m.user_id}><span>{medals[i]}</span><b>{m.name}</b><strong>{m.count} eventos</strong></div>)}</div><div className="ranking-list">{rows.slice(3,10).map((m,i)=><div key={m.user_id}><b>#{i+4} {m.name}</b><span>{m.count} eventos</span></div>)}</div></>}
function rankMembersForDay(members,events,credits,date){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const key=start.toLocaleDateString('en-CA');return members.map(m=>({...m,count:events.filter(e=>e.status==='Concluído'&&e.event_date===key&&((e.staff_ids||[]).includes(m.user_id)||e.responsible_id===m.user_id)).reduce((n,e)=>n+(String(e.name||'').toLowerCase().replace(/[^a-z]/g,'').includes('lategame')?2:1),0)+credits.filter(x=>x.user_id===m.user_id&&x.created_at>=start.toISOString()&&x.created_at<end.toISOString()).reduce((n,x)=>n+x.quantity,0)})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count).slice(0,10)}
function safeGoalHtml(value){const template=document.createElement('template');template.innerHTML=String(value||'');template.content.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());template.content.querySelectorAll('font').forEach(el=>{const span=document.createElement('span');const sizes={'1':'10px','2':'13px','3':'16px','4':'18px','5':'24px','6':'30px','7':'36px'};span.style.fontSize=sizes[el.getAttribute('size')||'3']||'16px';span.innerHTML=el.innerHTML;el.replaceWith(span)});template.content.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{if(a.name!=='style')el.removeAttribute(a.name);else{const safe=a.value.split(';').filter(x=>/^\s*(color|font-size|font-weight|font-style|text-decoration)\s*:\s*(#[0-9a-f]{3,8}|[a-z]+|rgb\([0-9.,% ]+\)|[0-9.]+(px|em|rem|%)|bold|normal|italic|underline|none)\s*$/i.test(x)).join(';');if(safe)el.setAttribute('style',safe);else el.removeAttribute('style')}});if(!['B','STRONG','I','EM','U','SPAN','DIV','P','BR'].includes(el.tagName)){el.replaceWith(...el.childNodes)}});return template.innerHTML}
function AgendaPublicEntry({entry,canEdit,onSave,onEdit,onDelete,onGoToReschedule,notify}){const [status,setStatus]=useState(entry.status||'Agendado');const [rescheduleDate,setRescheduleDate]=useState(entry.reschedule_date||'');const [rescheduleTime,setRescheduleTime]=useState(entry.reschedule_time?.slice(0,5)||'');const [unconfirmed,setUnconfirmed]=useState(!!entry.reschedule_unconfirmed);const [saving,setSaving]=useState(false);useEffect(()=>{setStatus(entry.status||'Agendado');setRescheduleDate(entry.reschedule_date||'');setRescheduleTime(entry.reschedule_time?.slice(0,5)||'');setUnconfirmed(!!entry.reschedule_unconfirmed)},[entry.status,entry.reschedule_date,entry.reschedule_time,entry.reschedule_unconfirmed]);const changeStatus=async value=>{setStatus(value);if(value!=='Remarcado'){setUnconfirmed(false);setRescheduleDate('');setRescheduleTime('');setSaving(true);try{await onSave(entry.agenda_date,entry.time_slot,{event:entry.event,host_id:entry.host_id,text:entry.text,status:value});notify('Status da agenda atualizado.')}catch(e){notify(errText(e));setStatus(entry.status||'Agendado')}finally{setSaving(false)}}};const saveReschedule=async()=>{if(!unconfirmed&&(!rescheduleDate||!rescheduleTime)){notify('Selecione a nova data e o novo horário, ou marque Não confirmado.');return;}setSaving(true);try{await onSave(entry.agenda_date,entry.time_slot,{event:entry.event,host_id:entry.host_id,text:entry.text,status:'Remarcado',reschedule_date:rescheduleDate,reschedule_time:rescheduleTime,reschedule_unconfirmed:unconfirmed});notify('Reagendamento salvo e incluído na nova data.')}catch(e){notify(errText(e))}finally{setSaving(false)}};return <div className="agenda-public-entry"><div className="agenda-entry-heading"><b>{entry.time_slot.slice(0,5)} · {entry.event||'Evento'}</b><span className={'agenda-status-badge status-'+String(entry.status||'Agendado').toLowerCase().replace(/\s+/g,'-')}>{entry.status||'Agendado'}</span></div><span>Anfitrião: {entry.host_id||'—'}</span><p>{entry.text}</p>{entry.status==='Remarcado'&&<div className="agenda-reschedule-summary">{entry.reschedule_unconfirmed?'Novo horário: Não confirmado':entry.reschedule_date&&entry.reschedule_time?'Evento reagendado para '+new Date(entry.reschedule_date+'T00:00:00').toLocaleDateString('pt-BR')+' às '+String(entry.reschedule_time).slice(0,5):'Reagendamento pendente'}{entry.reschedule_date&&entry.reschedule_time&&<button type="button" className="small-button agenda-go-reschedule" onClick={onGoToReschedule}>Ir para a nova data →</button>}</div>}{canEdit&&<><label className="agenda-status-control">Status<select disabled={saving} value={status} onChange={e=>changeStatus(e.target.value)}><option>Agendado</option><option>Concluído</option><option>Remarcado</option><option>Cancelado</option><option>Não Realizado</option></select></label>{status==='Remarcado'&&<div className="agenda-reschedule-editor"><label className="agenda-unconfirmed"><input type="checkbox" checked={unconfirmed} onChange={e=>setUnconfirmed(e.target.checked)}/> Não confirmado</label>{!unconfirmed&&<div className="agenda-reschedule-fields"><label>Nova data<input type="date" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)}/></label><label>Novo horário<input type="time" value={rescheduleTime} onChange={e=>setRescheduleTime(e.target.value)}/></label></div>}<button className="small-button" disabled={saving} onClick={saveReschedule}>{saving?'Salvando…':'Salvar reagendamento'}</button></div>}<div className="row-actions"><button className="small-button" onClick={onEdit}>Editar</button><button className="small-button danger-button" onClick={onDelete}>Excluir</button></div></>}</div>}
function AgendaSlot({date,time,entry,onSave,notify}){const [event,setEvent]=useState(entry.event||'');const [host,setHost]=useState(entry.host_id||'');const [note,setNote]=useState(entry.text||'');const [saving,setSaving]=useState(false);useEffect(()=>{setEvent(entry.event||'');setHost(entry.host_id||'');setNote(entry.text||'')},[entry.event,entry.host_id,entry.text,date,time]);const persist=async()=>{setSaving(true);try{await onSave(date,time+':00',{event,host_id:host,text:note});notify('Horário salvo.')}catch(e){notify(errText(e))}finally{setSaving(false)}};return <div className="agenda-slot"><strong>{time}</strong><input aria-label={'Evento às '+time} placeholder="Evento" value={event} onChange={e=>setEvent(e.target.value)}/><input aria-label={'Anfitrião às '+time} placeholder="Anfitrião (ID)" value={host} onChange={e=>setHost(e.target.value)}/><input aria-label={'Texto às '+time} placeholder="Texto" value={note} onChange={e=>setNote(e.target.value)}/><button className="small-button" disabled={saving} onClick={persist}>{saving?'Salvando…':'Salvar'}</button></div>}
function Stat({title,value,hint}){return <article className="stat"><span>{title}</span><strong>{value}</strong><small>{hint}</small></article>}
function Empty({text}){return <div className="empty">{text||'Nenhum registro encontrado.'}</div>}
function buildWinnerAnnouncement(eventName,winners){const mentions=(winners||[]).map(w=>String(w.discord||'').trim()).filter(Boolean).map(id=>'<@'+id+'>').join(' ');return '# '+eventName+'\n\n# 🥇  '+(mentions||'Vencedor não informado')+'\n\n** A Equipe de Eventos agradece a todos que participaram e fizeram parte desse grande evento! A presença e o empenho de cada um foram fundamentais para tornar esse momento especial. **\n\n** Esperamos contar com vocês nos próximos eventos. Até a próxima! 🏆❤️ **\n\n*@here <@&1558172068435066880> <@&1066355812857020487>'}
function EventsTable({rows,onEdit,onDelete,admin}){if(!rows.length)return <Empty text="Nenhum evento encontrado."/>;return <div className="table-wrap"><table><thead><tr><th>EVENTO</th><th>DATA</th><th>HORÁRIO</th><th>VENCEDORES</th><th>MENSAGEM DE FINALIZAÇÃO</th><th>FOTO DO VENCEDOR</th><th>PRINT DO EVENTO</th><th>STATUS</th>{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=>{const eventPrint=r.event_image_path?supabase.storage.from('lisboa-media').getPublicUrl(r.event_image_path).data.publicUrl:null;const winnerPrint=r.winner_image_path?supabase.storage.from('lisboa-media').getPublicUrl(r.winner_image_path).data.publicUrl:null;const winners=(r.winners||[]).filter(w=>w.discord);const announcement=buildWinnerAnnouncement(r.name,winners);return <tr key={r.id}><td><b>{r.name}</b></td><td>{r.event_date||'—'}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{(r.winners||[]).map(w=>w.staff_id).filter(Boolean).join(', ')||'—'}</td><td><div className="winner-announcement"><pre className="winner-announcement-text">{announcement}</pre><button className="small-button" onClick={async()=>{try{await navigator.clipboard.writeText(announcement);alert('Mensagem de finalização copiada.');}catch(e){alert('Não foi possível copiar automaticamente.');}}}>Copiar mensagem</button></div></td><td>{winnerPrint?<div className="winner-image-cell"><a href={winnerPrint} target="_blank" rel="noreferrer"><img className="winner-preview" src={winnerPrint} alt={'Foto do vencedor de '+r.name}/></a><button className="small-button" onClick={async()=>{try{const response=await fetch(winnerPrint);const blob=await response.blob();if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Não suportado');const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Falha ao preparar imagem');await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);alert('Foto copiada.');}catch(e){window.open(winnerPrint,'_blank','noopener,noreferrer');alert('Imagem aberta. Use copiar imagem ou salvar.');}}}>Copiar foto</button></div>:'—'}</td><td>{eventPrint?<a href={eventPrint} target="_blank" rel="noreferrer">Abrir print</a>:'—'}</td><td><span className="status good">{r.status}</span></td>{admin&&<td><button className="small-button danger-button" onClick={()=>onDelete(r)}>Remover</button></td>}</tr>})}</tbody></table></div>}
function EventRegistrationLogs({rows}){const ordered=[...rows].sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.event_time||'').localeCompare(String(a.event_time||''))||new Date(b.created_at||0)-new Date(a.created_at||0));if(!ordered.length)return <Empty text="Ainda não há registros de eventos."/>;return <div className="table-wrap"><table><thead><tr><th>EVENTO</th><th>EVENTOS POR STAFF</th><th>REGISTRADO POR</th><th>STAFFS MARCADOS</th><th>DATA</th><th>HORA</th></tr></thead><tbody>{ordered.map(r=>{const double=String(r.event_name||'').toLowerCase().replace(/[^a-z]/g,'').includes('lategame');return <tr key={r.id}><td><b>{r.event_name}</b></td><td><span className="status good">+{double?2:1} por membro</span></td><td>{r.registered_by_name}</td><td>{r.staff_names||'Nenhum staff marcado'}</td><td>{r.event_date||'—'}</td><td>{r.event_time?.slice(0,5)||'—'}</td></tr>})}</tbody></table></div>}
function EventParticipationLogs({rows,members}){if(!rows.length)return <Empty text="Ainda não há participações registradas."/>;return <div className="table-wrap"><table><thead><tr><th>STAFF</th><th>EVENTO</th><th>REGISTRADO POR</th><th>DATA</th><th>HORA</th><th>PARTICIPAÇÃO</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{members.find(m=>m.user_id===r.staff_user_id)?.name||'Membro'}</b></td><td>{r.event_name}</td><td>{r.registered_by_name}</td><td>{r.event_date||'—'}</td><td>{r.event_time?.slice(0,5)||'—'}</td><td><span className="status good">+{r.event_quantity||1} eventos</span></td></tr>)}</tbody></table></div>}
function SchedulesTable({rows,onEdit,onDelete,admin,responses=[],currentId,onAbsence,members=[],showAbsentees=false}){if(!rows.length)return <Empty text="Nenhuma escala cadastrada."/>;return <div className="table-wrap"><table><thead><tr><th>ATIVIDADE</th><th>DATA</th><th>HORÁRIO</th>{onAbsence&&<th>PRESENÇA</th>}{showAbsentees&&<th>AUSÊNCIAS</th>}{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=>{const response=responses.find(x=>x.schedule_id===r.id&&x.user_id===currentId);const absent=!!response?.is_absent;const absentNames=responses.filter(x=>x.schedule_id===r.id&&x.is_absent).map(x=>members.find(m=>m.user_id===x.user_id)?.name).filter(Boolean);return <tr key={r.id}><td><b>{r.title}</b></td><td>{r.schedule_date}</td><td>{r.start_time?.slice(0,5)||'—'}</td>{onAbsence&&<td><div className="attendance-control"><label><input type="radio" name={'attendance-'+r.id} checked={!absent} onChange={()=>onAbsence(r.id,false,'')}/> Presente</label><label><input type="radio" name={'attendance-'+r.id} checked={absent} onChange={()=>onAbsence(r.id,true,response?.absence_reason||'')}/> Ausente</label>{absent&&<textarea rows="2" placeholder="Motivo da ausência" defaultValue={response?.absence_reason||''} onBlur={e=>onAbsence(r.id,true,e.target.value)}/>}</div></td>}{showAbsentees&&<td>{absentNames.join(', ')||'—'}</td>}{admin&&<td><div className="row-actions"><button className="small-button" onClick={()=>onEdit(r)}>Editar</button><button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button></div></td>}</tr>})}</tbody></table></div>}
function AvailabilityTable({rows,onDelete,members,canDelete}){if(!rows.length)return <Empty text="Nenhuma disponibilidade cadastrada."/>;return <div className="table-wrap"><table><thead><tr><th>MEMBRO</th><th>TIPO</th><th>INÍCIO</th><th>RETORNO</th><th>HORÁRIOS</th><th>MOTIVO / OBSERVAÇÕES</th><th>AÇÕES</th></tr></thead><tbody>{rows.map(r=>{const member=members.find(m=>m.user_id===r.user_id);return <tr key={r.id}><td><b>{member?.name||'Membro'}</b><small className="subcell">{member?.role||''}</small></td><td>{r.is_absent?'Ausência':'Disponibilidade'}</td><td>{r.available_date||'—'}</td><td>{r.is_absent?(r.absence_end_date||'—'):'—'}</td><td>{r.is_absent?'—':(r.start_time?.slice(0,5)||'—')+' – '+(r.end_time?.slice(0,5)||'—')}</td><td>{r.is_absent?(r.absence_reason||r.notes||'—'):(r.notes||'—')}</td><td>{canDelete(r)&&<button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button>}</td></tr>})}</tbody></table></div>}

function DailyShiftTable({rows,members}){if(!rows.length)return <Empty text="Nenhuma escala disponível neste momento."/>;return <div className="daily-shifts">{[...rows].sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).map(r=>{const ids=Array.isArray(r.assigned_members)?r.assigned_members:[];const names=ids.map(id=>members.find(m=>m.user_id===id)?.name).filter(Boolean);return <article className="daily-shift-card" key={r.id}><div className="daily-shift-time">{r.start_time?.slice(0,5)}</div><div className="daily-shift-members">{names.length?names.map(name=><span key={name}>{name}</span>):<span>Membros não encontrados</span>}</div></article>})}</div>}
function LogList({rows}){if(!rows.length)return <Empty text="Ainda não há atividades registradas."/>;return <div className="log-list">{rows.map(l=><div className="log-item" key={l.id}><span className="log-dot"/><div><b>{l.action}</b><p>{l.detail||'—'}</p><small>{l.actor_name||'Equipe'} · {new Date(l.created_at).toLocaleString('pt-BR')}</small></div></div>)}</div>}
function MysteryBoxAdminLogs({rows,members}){const sorted=[...rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));return <div className="table-wrap"><table><thead><tr><th>MEMBRO</th><th>DATA/HORA</th><th>CAIXA</th><th>AÇÃO</th><th>DROP</th><th>TOKENS</th><th>CHAVES</th></tr></thead><tbody>{sorted.map(r=><tr key={r.id}><td>{members.find(m=>m.user_id===r.user_id)?.name||'—'}</td><td>{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{r.box_type}</td><td>{r.action}</td><td>{({'Comum':'Não foi dessa vez','Incomum':'Tente outra vez','Rara':'5 Tokens','Lendária':'10 Tokens','Compra':'Compra de caixas'})[r.drop_type]||r.drop_type}</td><td>{r.token_reward}</td><td>{r.key_cost}</td></tr>)}</tbody></table></div>}function WalletTransactionsLog({keys,tokens,members}){const rows=[...keys.map(x=>({...x,wallet:'Chaves',detail:x.source||'Movimentação de chaves'})),...tokens.map(x=>({...x,wallet:'Tokens',detail:x.reason||'Movimentação de Tokens'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));if(!rows.length)return <Empty text="Ainda não há movimentações de carteiras."/>;return <div className="table-wrap"><table><thead><tr><th>DATA/HORA</th><th>MEMBRO</th><th>CARTEIRA</th><th>MOVIMENTAÇÃO</th><th>QUANTIDADE</th><th>REALIZADO POR</th></tr></thead><tbody>{rows.map(r=><tr key={r.wallet+'-'+r.id}><td>{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{members.find(m=>m.user_id===r.user_id)?.name||'—'}</td><td>{r.wallet}</td><td>{r.detail}</td><td><span className={r.amount>=0?'status good':'status bad'}>{r.amount>0?'+':''}{r.amount}</span></td><td>{members.find(m=>m.user_id===r.created_by)?.name||(r.created_by?'Conta não localizada':'Sistema / automático')}</td></tr>)}</tbody></table></div>}
function SectionLogs({rows,types,title}){const filtered=rows.filter(l=>types.includes(l.entity_type)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const [page,setPage]=useState(0);const pages=Math.max(1,Math.ceil(filtered.length/10));const shown=filtered.slice(page*10,(page+1)*10);return <section className="section-logs"><div className="panel-head"><h3>{title}</h3></div><LogList rows={shown}/>{pages>1&&<div className="log-pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page+1} / {pages}</span><button className="secondary" disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>}</section>}
function EventAdminLog({rows,members}){const [page,setPage]=useState(0);const list=[...rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const pages=Math.max(1,Math.ceil(list.length/10));return <><div className="table-wrap"><table><thead><tr><th>EVENTO</th><th>DATA</th><th>HORA</th><th>REGISTRADO POR</th></tr></thead><tbody>{list.slice(page*10,(page+1)*10).map(e=><tr key={e.id}><td>{e.name}</td><td>{e.event_date}</td><td>{e.start_time?.slice(0,5)||'—'}</td><td>{members.find(m=>m.user_id===e.created_by)?.name||'—'}</td></tr>)}</tbody></table></div>{pages>1&&<div className="log-pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page+1} / {pages}</span><button className="secondary" disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>}</>}

function Modal({modal,close,members,session,isDev,saveEvent,saveAnnouncement,saveEventCredit,saveWalletAdjustment,saveGoal,saveSchedule,saveAvailability,saveDailyShift,saveDailySchedule,saveMember,saveOwnProfile,saveMemberPassword,notify,currentRole,onWalletOpen,onMemberAction,keys=[],tokens=[]}){
 const [form,setForm]=useState(modal.data||{});const [saving,setSaving]=useState(false);const update=(k,v)=>setForm(p=>({...p,[k]:v}));
 const eventStaff=members.filter(m=>m.status==='Ativo');
 const shiftStaff=members.filter(m=>m.status==='Ativo'&&['Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral'].includes(m.role));
 const toggleShiftMember=(id,checked)=>{const next=checked?[...(form.member_ids||[]),id]:(form.member_ids||[]).filter(x=>x!==id);if(next.length>4){notify('Selecione no máximo 4 membros.');return;}update('member_ids',next);};
 const toggleStaff=(id,checked)=>{const next=checked?[...(form.staff_ids||[]),id]:(form.staff_ids||[]).filter(x=>x!==id);const senior=next.filter(x=>eventStaff.find(m=>m.user_id===x)?.role!=='Treinamento');if(senior.length>4){notify('Máximo de 4 staffs com cargo de Aprendiz ou superior.');return;}update('staff_ids',next);};
 const field=(label,key,type='text',required=false)=><label>{label}<input type={type} value={form[key]??''} required={required} disabled={form.mode==='view'} onChange={e=>update(key,e.target.value)}/></label>;
 const select=(label,key,opts)=><label>{label}<select value={form[key]??opts[0]} disabled={form.mode==='view'} onChange={e=>update(key,e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
 const area=(label,key)=><label className="wide">{label}<textarea rows="6" value={form[key]??''} onChange={e=>update(key,e.target.value)}/></label>;
 const submit=async e=>{e.preventDefault();setSaving(true);try{if(modal.type==='event')await saveEvent(form);if(modal.type==='announcement')await saveAnnouncement(form);if(modal.type==='event_credit')await saveEventCredit(form);if(modal.type==='wallet_adjust')await saveWalletAdjustment(form);if(modal.type==='goal')await saveGoal(form);if(modal.type==='schedule')await saveSchedule(form);if(modal.type==='daily_schedule')await saveDailySchedule(form);if(modal.type==='availability')await saveAvailability(form);if(modal.type==='daily_shift')await saveDailyShift(form);if(modal.type==='member'&&form.mode!=='view')await saveMember(form);if(modal.type==='profile_edit')await saveOwnProfile(form);if(modal.type==='admin_password')await saveMemberPassword(form);}catch(err){notify(errText(err));}finally{setSaving(false)}};
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal-card" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">LISBOA EVENTOS</p><h2>{{event:'Registrar evento',announcement:'Publicar aviso',event_credit:'Gerenciar eventos',wallet_adjust:'Gerenciar carteira',goal:form.id?'Editar meta':'Nova meta',schedule:form.id?'Editar escala':'Nova escala',availability:'Informar disponibilidade',daily_shift:'Criar escala',daily_schedule:form.id?'Editar cronograma':'Adicionar ao cronograma',member:form.mode==='role'?'Alterar cargo':form.mode==='view'?'Dados do membro':'Editar dados do membro',profile_edit:'Atualizar meu cadastro',admin_password:'Redefinir senha de membro'}[modal.type]}</h2></div><button type="button" className="icon-close" onClick={close}>×</button></div><div className="form-grid">
 {modal.type==='announcement'&&<>{field('Título (opcional)','title')}<label className="wide">Texto do aviso<RichEditor value={form.content||''} onChange={v=>update('content',v)}/></label><label className="wide">Anexar imagem (opcional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>update('image_file',e.target.files?.[0]||null)}/></label></>}
 {modal.type==='wallet_adjust'&&<><p className="notice wide">Movimentar saldo de <b>{form.member_name}</b>.</p><label>Carteira<select value={form.wallet_type} onChange={e=>update('wallet_type',e.target.value)}><option value="chaves">Chaves</option><option value="tokens">Tokens</option></select></label><label>Operação<select value={form.operation} onChange={e=>update('operation',e.target.value)}><option value="add">Adicionar</option><option value="remove">Remover</option></select></label>{field('Quantidade','quantity','number',true)}</>}
 {modal.type==='event_credit'&&<><p className="notice wide">Ajustar eventos contabilizados para <b>{form.member_name}</b>. Isso não cria nem exclui registros reais de eventos.</p><label>Operação<select value={form.operation||'add'} onChange={e=>update('operation',e.target.value)}><option value="add">Adicionar eventos</option><option value="remove">Remover eventos</option></select></label>{field('Quantidade de eventos','quantity','number',true)}<label className="wide checkbox-line"><input type="checkbox" checked={form.include_in_ranking!==false} onChange={e=>update('include_in_ranking',e.target.checked)}/> Contabilizar na meta do ranking</label></>}
 {modal.type==='event'&&<>{field('Evento','name','text',true)}{field('Data','event_date','date',true)}{field('Hora de início','start_time','time',true)}<div className="wide staff-picker"><b>Staff</b>{eventStaff.map(m=><label className="staff-option" key={m.user_id}><input type="checkbox" checked={(form.staff_ids||[]).includes(m.user_id)} disabled={form.assigned_member_id===m.user_id} onChange={e=>toggleStaff(m.user_id,e.target.checked)}/>{m.name} · {m.role}</label>)}</div><label>ID dos vencedores (separe por vírgula)<input type="text" value={form.winner_id??''} onChange={e=>update('winner_id',e.target.value)}/></label><label>IDs do Discord dos vencedores (na mesma ordem, separados por vírgula)<input type="text" value={form.winner_discord??''} onChange={e=>update('winner_discord',e.target.value)}/></label><label>Print do vencedor<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>update('winner_image_file',e.target.files?.[0])}/></label><label>Print do evento<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>update('event_image_file',e.target.files?.[0])}/></label></>}
 {modal.type==='goal'&&<>{field('Título','title','text',true)}{field('Quantidade alvo','target_quantity','number',true)}{field('Início do período','period_start','date')}{field('Fim do período','period_end','date')}<label>Responsável pela meta<select value={form.responsible_id??''} onChange={e=>update('responsible_id',e.target.value)}><option value="">Meta geral</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>)}</select></label><RichEditor value={form.description||''} onChange={v=>update('description',v)}/></>}
 {modal.type==='daily_schedule'&&<>{field('Nome do evento','event_name','text',true)}{field('Horário','event_time','time',true)}{select('Categoria','category',['EVENTOS','PVP','ENTRETENIMENTO'])}</>}
 {modal.type==='schedule'&&<>{field('Atividade','title','text',true)}{field('Data','schedule_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{select('Responsável','responsible_id',['',...members.map(m=>m.user_id)])}{area('Observações','notes')}</>}
 {modal.type==='availability'&&<>{field('Data de início','available_date','date',true)}<label className="wide">Tipo<select value={form.is_absent?'ausencia':'disponibilidade'} onChange={e=>{update('is_absent',e.target.value==='ausencia');update('start_time','');update('end_time','')}}><option value="disponibilidade">Disponibilidade</option><option value="ausencia">Ausência</option></select></label>{form.is_absent?<>{area('Motivo da ausência','absence_reason')}{field('Data de retorno','absence_end_date','date',true)}</>:<>{field('Início','start_time','time')}{field('Fim','end_time','time')}{area('Observações','notes')}</>}</>}
 {modal.type==='daily_shift'&&<>{field('Horário','start_time','time',true)}<div className="wide staff-picker"><b>Selecionar membros (máximo 4)</b>{shiftStaff.map(m=><label className="staff-option" key={m.user_id}><input type="checkbox" checked={(form.member_ids||[]).includes(m.user_id)} onChange={e=>toggleShiftMember(m.user_id,e.target.checked)}/>{m.name} · {m.role}</label>)}</div><p className="notice wide">A escala será exibida para todos os cargos e desaparecerá uma hora após o horário marcado.</p></>}
 {modal.type==='profile_edit'&&<><p className="notice wide">Atualize seus dados pessoais. Se informar uma nova senha, ela será alterada imediatamente. A troca de e-mail poderá exigir confirmação enviada pelo Supabase.</p>{field('Nome','name','text',true)}{field('ID','staff_id','text',true)}{field('Discord','discord')}{field('Telefone','phone','tel')}{field('EQPG','eqpg')}{field('E-mail','email','email',true)}{field('Nova senha (opcional)','password','password')}{field('Confirmar nova senha','confirm_password','password')}</>}
 {modal.type==='admin_password'&&<><p className="notice wide">A nova senha será aplicada imediatamente. Ela não será exibida novamente nem salva no histórico.</p><label className="wide">Membro<select required value={form.user_id||''} onChange={e=>update('user_id',e.target.value)}><option value="">Selecione um membro</option>{members.filter(m=>m.user_id!==session.user.id&&['Responsável','Supervisor','Especialista','Analista','Aprendiz','Treinamento'].includes(m.role)).sort((a,b)=>a.name.localeCompare(b.name)).map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>)}</select></label>{field('Nova senha','password','password',true)}{field('Confirmar nova senha','confirm_password','password',true)}</>}
 {modal.type==='member'&&<>{form.mode==='role'?<>{field('Membro','name')}{select('Cargo','role',isDev||currentRole==='Responsável Geral'?['Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral']:currentRole==='Responsável'?['Treinamento','Aprendiz','Analista','Especialista','Supervisor']:['Treinamento','Aprendiz','Analista','Especialista'])}</>:<>{field('ID do membro','staff_id','text',true)}{field('Nome','name','text',true)}{field('Discord','discord')}{field('WhatsApp','whatsapp','tel')}{field('Telefone','phone','tel')}{field('EQPG','eqpg')}{select('Status','status',STATUSES)}{(form.mode==='edit'&&(['Responsável','Responsável Geral'].includes(currentRole)||isDev))&&<div className="wide wallet-admin-actions"><button type="button" className="secondary" onClick={()=>onWalletOpen(form,'chaves')}>🔑 Chaves</button><button type="button" className="secondary" onClick={()=>onWalletOpen(form,'tokens')}>🪙 Tokens</button></div>}{form.mode==='edit'&&(['Responsável','Responsável Geral'].includes(currentRole)||isDev)&&<div className="wide member-wallet-summary"><h3>Carteiras do membro</h3><div><span>🔑 Chaves</span><b>{keys.filter(x=>x.user_id===form.user_id).reduce((sum,x)=>sum+Number(x.amount||0),0)}</b></div><div><span>🪙 Tokens</span><b>{tokens.filter(x=>x.user_id===form.user_id).reduce((sum,x)=>sum+Number(x.amount||0),0)}</b></div></div>}{form.mode==='edit'&&<div className="wide member-actions-panel"><h3>Ações da equipe</h3><p>Gerencie as permissões e ações disponíveis para este membro.</p><div className="member-actions-grid">{(ADMIN_ROLES.includes(currentRole)||isDev)&&<button type="button" className="secondary" onClick={()=>onMemberAction('role',form)}>Cargos</button>}{(['Responsável','Responsável Geral'].includes(currentRole)||isDev)&&<button type="button" className="secondary" onClick={()=>onMemberAction('events',form)}>Eventos</button>}{(currentRole==='Responsável Geral'||isDev)&&<button type="button" className="danger-button" onClick={()=>onMemberAction('remove',form)}>Remover</button>}{currentRole==='Responsável Geral'&&<><button type="button" className="secondary" onClick={()=>onMemberAction('telagem',form)}>{form.tags?.includes('Telador')?'Retirar tag de Telagem':'Adicionar tag de Telagem'}</button><button type="button" className="secondary" onClick={()=>onMemberAction('dev',form)}>{form.tags?.includes('DEV')?'Retirar tag DEV':'Adicionar tag DEV'}</button></>}</div></div>}</>}</>}
 </div><div className="modal-footer"><button type="button" className="secondary" onClick={close}>Cancelar</button>{!(modal.type==='member'&&form.mode==='view')&&<button className="primary" disabled={saving}>{saving?'Salvando…':'Salvar'}</button>}</div></form></div>
}
function SetupError(){return <main className="center-screen"><div className="panel setup-card"><h1>Configuração necessária</h1><p>O site ainda não recebeu as variáveis de ambiente do Supabase.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente de publicação e gere o build novamente.</p></div></main>}

createRoot(document.getElementById('root')).render(<App/>);
