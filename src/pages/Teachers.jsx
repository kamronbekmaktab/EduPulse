import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Phone, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase'; // Firebase sozlama faylingiz manzili
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const formatPhoneNumber = (value) => {
  if (!value) return '+998 ';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  let result = '+998 ';
  if (digits.length > 0) result += digits.slice(0, 2);
  if (digits.length >= 3) result += ' ' + digits.slice(2, 5);
  if (digits.length >= 6) result += ' ' + digits.slice(5, 7);
  if (digits.length >= 8) result += ' ' + digits.slice(7, 9);
  return result;
};

export default function Teachers() {
  const [user] = useState(() => JSON.parse(localStorage.getItem('edupulse_user') || '{}'));

  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [classError, setClassError] = useState('');

  // Ikkinchi fanni biriktirishni tasdiqlash modali holati
  const [confirmSubjectModal, setConfirmSubjectModal] = useState(null);

  const [newTeacher, setNewTeacher] = useState({
    fullName: '',
    phone: '+998 ',
    teacherType: 'class_head',
    assignedClass: '',
    subject: ''
  });

  // Firestore'dan ma'lumotlarni yuklab olish
  useEffect(() => {
    loadDataFromFirebase();
  }, []);

  const loadDataFromFirebase = async () => {
    try {
      // 1. O'qituvchilarni yuklash
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const teachersData = teachersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setTeachersList(teachersData.length > 0 ? teachersData : [
        
      ]);

      // 2. Sinflarni yuklash
      const classesSnap = await getDocs(collection(db, 'classes'));
      setClassesList(classesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));

      // 3. Akkauntlarni yuklash
      const accountsSnap = await getDocs(collection(db, 'teacher_accounts'));
      setAccountsList(accountsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    }
  };

  const isAdmin = user?.role === 'administrator';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Faqat akkaunti bor va hali "O'qituvchilar" bo'limiga qo'shilmagan ustozlar ro'yxati
  const availableAccounts = accountsList.filter(acc => {
    const accName = acc.fullName || acc.full_name || '';
    return !teachersList.some(t => (t.fullName || t.full_name || '').trim().toLowerCase() === accName.trim().toLowerCase());
  });

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setClassError('');

    const inputNameClean = newTeacher.fullName.trim().toLowerCase();

    // 1. Akkauntlar orasida bor-yo'qligini tekshirish
    const hasAccount = accountsList.some(acc => {
      const accName = acc.fullName || acc.full_name || '';
      return accName && accName.trim().toLowerCase() === inputNameClean;
    });

    if (!hasAccount) {
      setClassError("Ushbu ustoz tizimda mavjud emas! Iltimos, avval 'O'qituvchilar Akkauntlari' bo'limida ushbu ustoz uchun login va parol yarating.");
      return;
    }

    const needsClass = newTeacher.teacherType === 'class_head' || newTeacher.teacherType === 'both';
    const needsSubject = newTeacher.teacherType === 'subject_teacher' || newTeacher.teacherType === 'both';

    if (needsSubject && !newTeacher.subject.trim()) {
      setClassError("Iltimos, o'qitiladigan fanni yozing!");
      return;
    }

    // 2. Ustoz allaqachon ro'yxatda bormi tekshirish
    const existingTeacher = teachersList.find(t => {
      const tName = t.fullName || t.full_name || '';
      return tName && tName.trim().toLowerCase() === inputNameClean;
    });

    if (existingTeacher) {
      const existingSubjects = (existingTeacher.subject || '').split(',').map(s => s.trim().toLowerCase());
      const newSubClean = newTeacher.subject.trim().toLowerCase();

      // Agar kiritilgan fan ham allaqachon mavjud bo'lsa
      if (existingSubjects.includes(newSubClean)) {
        setClassError("Ushbu ustoz allaqachon ushbu fandan dars beruvchi bo'lib qo'shilgan!");
        return;
      } else {
        // Ustoz bor, lekin fani boshqacha -> Tasdiqlash modalini ochamiz
        setConfirmSubjectModal({
          existingTeacher,
          newSubject: newTeacher.subject.trim(),
          newTeacherData: newTeacher
        });
        return;
      }
    }

    if (needsClass && !newTeacher.assignedClass) {
      setClassError("Iltimos, biriktiriladigan sinfni tanlang!");
      return;
    }

    if (needsClass) {
      const existing = teachersList.find(t => (t.assignedClass || t.assigned_class) === newTeacher.assignedClass);
      if (existing) {
        setClassError(`Ushbu ${newTeacher.assignedClass} sinfi allaqachon band! (${existing.fullName || existing.full_name} rahbar)`);
        return;
      }
    }

    const teacherId = `TCH-${Date.now().toString().slice(-4)}`;
    const teacherObj = {
      full_name: newTeacher.fullName,
      fullName: newTeacher.fullName,
      phone: newTeacher.phone.length > 5 ? newTeacher.phone : 'Kiritilmagan',
      teacherType: newTeacher.teacherType,
      assignedClass: needsClass ? newTeacher.assignedClass : '',
      subject: needsSubject ? newTeacher.subject : ''
    };

    try {
      await setDoc(doc(db, 'teachers', teacherId), teacherObj);
      setTeachersList(prev => [...prev, { id: teacherId, ...teacherObj }]);

      if (needsClass) {
        const targetClass = classesList.find(c => c.id === newTeacher.assignedClass || c.class_id === newTeacher.assignedClass);
        if (targetClass) {
          const cId = targetClass.id || targetClass.class_id;
          await setDoc(doc(db, 'classes', cId), { teacher: newTeacher.fullName, teacherPhone: newTeacher.phone }, { merge: true });
          setClassesList(prev => prev.map(c => (c.id === cId || c.class_id === cId) ? { ...c, teacher: newTeacher.fullName, teacherPhone: newTeacher.phone } : c));
        }
      }

      setNewTeacher({ fullName: '', phone: '+998 ', teacherType: 'class_head', assignedClass: '', subject: '' });
      setIsAddOpen(false);
      showToast("Yangi o'qituvchi muvaffaqiyatli qo'shildi!");
    } catch (err) {
      console.error("O'qituvchi qo'shishda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  // Ikkinchi fanni tasdiqlash (HA tugmasi)
  const handleConfirmMultiSubject = async () => {
    if (!confirmSubjectModal) return;

    const { existingTeacher, newSubject, newTeacherData } = confirmSubjectModal;

    const combinedSubject = existingTeacher.subject 
      ? `${existingTeacher.subject}, ${newSubject}`
      : newSubject;

    const updatedPayload = {
      subject: combinedSubject,
      assignedClass: newTeacherData.assignedClass || existingTeacher.assignedClass || '',
      teacherType: 'both'
    };

    try {
      await setDoc(doc(db, 'teachers', existingTeacher.id), updatedPayload, { merge: true });

      setTeachersList(prev => prev.map(t => {
        if (t.id === existingTeacher.id) {
          return { ...t, ...updatedPayload };
        }
        return t;
      }));

      setConfirmSubjectModal(null);
      setIsAddOpen(false);
      setNewTeacher({ fullName: '', phone: '+998 ', teacherType: 'class_head', assignedClass: '', subject: '' });
      const tName = existingTeacher.fullName || existingTeacher.full_name;
      showToast(`${tName} ga ikkinchi fan (${newSubject}) muvaffaqiyatli biriktirildi!`);
    } catch (err) {
      console.error("Ikkinchi fanni biriktirishda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!isAdmin) return;

    const teacherToDelete = teachersList.find(t => t.id === id);
    if (!teacherToDelete) return;

    try {
      await deleteDoc(doc(db, 'teachers', id));
      setTeachersList(prev => prev.filter(t => t.id !== id));

      const assignedCls = teacherToDelete.assignedClass || teacherToDelete.assigned_class;
      const tName = teacherToDelete.fullName || teacherToDelete.full_name;

      const updatedClasses = classesList.map(c => {
        const cTeacher = c.teacher || c.teacher_name;
        const cId = c.id || c.class_id;
        if (cTeacher === tName || cId === assignedCls) {
          return { ...c, teacher: 'Tayinlanmagan', teacherPhone: 'Kiritilmagan' };
        }
        return c;
      });

      for (const cls of updatedClasses) {
        const cId = cls.id || cls.class_id;
        if (cls.teacher === 'Tayinlanmagan') {
          await setDoc(doc(db, 'classes', cId), { teacher: 'Tayinlanmagan', teacherPhone: 'Kiritilmagan' }, { merge: true });
        }
      }

      setClassesList(updatedClasses);
      showToast("O'qituvchi o'chirildi va sinf 'Tayinlanmagan' holatiga o'tkazildi!");
    } catch (err) {
      console.error("O'qituvchini o'chirishda xatolik:", err);
      showToast("O'chirishda xatolik yuz berdi!");
    }
  };

  return (
    <div className="px-4 sm:px-8 max-w-7xl mx-auto space-y-6 py-4">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            O'qituvchilar Boshqaruvi
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            O'qituvchilar ro'yxati, sinf va fan biriktirmalari
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => { setIsAddOpen(true); setClassError(''); }}
            className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>O'qituvchi Qo'shish</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachersList.map((tch) => {
          const tName = tch.fullName || tch.full_name || '';
          const tClass = tch.assignedClass || tch.assigned_class || '';
          return (
            <div key={tch.id} className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-3 relative group">
              <div className="flex justify-between items-start pr-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                    {tName ? tName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'TC'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{tName}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{tch.id}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => handleDeleteTeacher(tch.id)}
                  className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="text-xs space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
                <p className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span>Tel: <strong>{tch.phone}</strong></span>
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(tch.teacherType === 'class_head' || tch.teacherType === 'both') && tClass && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      Sinf rahbari: {tClass}
                    </span>
                  )}
                  {(tch.teacherType === 'subject_teacher' || tch.teacherType === 'both') && tch.subject && (
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      Fan: {tch.subject}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900">Yangi O'qituvchi Qo'shish</h3>

            {classError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start space-x-2.5 font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{classError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ismi va Familiyasi</label>
                <input
                  type="text"
                  required
                  list="teacher-accounts-list"
                  placeholder="Bitta harf kiriting (masalan: K)"
                  value={newTeacher.fullName}
                  onChange={(e) => {
                    setNewTeacher({ ...newTeacher, fullName: e.target.value });
                    setClassError('');
                  }}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />

                <datalist id="teacher-accounts-list">
                  {availableAccounts.map((acc) => {
                    const accName = acc.fullName || acc.full_name;
                    return (
                      <option key={acc.id} value={accName} />
                    );
                  })}
                </datalist>

                <p className="text-[10px] text-slate-400 mt-1">
                  * Faqat tizimda ro'yxatdan o'tgan ustozlar ko'rinadi.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefon Raqami</label>
                <input
                  type="text"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: formatPhoneNumber(e.target.value) })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">O'qituvchi Maqomi</label>
                <select
                  value={newTeacher.teacherType}
                  onChange={(e) => {
                    setNewTeacher({ ...newTeacher, teacherType: e.target.value });
                    setClassError('');
                  }}
                  className="w-full p-3 border rounded-xl outline-none font-bold text-slate-700 bg-white"
                >
                  <option value="class_head">Sinf rahbari</option>
                  <option value="subject_teacher">Fan o'qituvchisi</option>
                  <option value="both">Ikkalasi ham</option>
                </select>
              </div>

              {(newTeacher.teacherType === 'class_head' || newTeacher.teacherType === 'both') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biriktiriladigan Sinf</label>
                  <select
                    value={newTeacher.assignedClass}
                    onChange={(e) => {
                      setNewTeacher({ ...newTeacher, assignedClass: e.target.value });
                      setClassError('');
                    }}
                    className="w-full p-3 border rounded-xl outline-none font-bold text-slate-700 bg-white"
                  >
                    <option value="">Sinfni tanlang...</option>
                    {classesList.map(c => {
                      const cId = c.id || c.class_id;
                      const isTaken = teachersList.some(t => (t.assignedClass || t.assigned_class) === cId);
                      return (
                        <option key={cId} value={cId}>
                          {c.name || cId} {isTaken ? '(Banda)' : '(Bosh)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {(newTeacher.teacherType === 'subject_teacher' || newTeacher.teacherType === 'both') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dars Beradigan Fani</label>
                  <input
                    type="text"
                    placeholder="Masalan: Matematika, Fizika"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition">
                O'qituvchini Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* IKKINCHI FANNI BIRIKTIRISHNI TASDIQLASH MODALI */}
      {confirmSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Ikkinchi fan biriktirilsinmi?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-blue-600">{confirmSubjectModal.existingTeacher.fullName || confirmSubjectModal.existingTeacher.full_name}</strong> allaqachon{' '}
                <strong className="text-slate-900">"{confirmSubjectModal.existingTeacher.subject || 'Sinf rahbari'}"</strong> sifatida ro'yxatda bor. Unga ikkinchi fan sifatida{' '}
                <strong className="text-emerald-600">"{confirmSubjectModal.newSubject}"</strong> fanini ham biriktirishni tasdiqlaysizmi?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmSubjectModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Yo'q, Bekor qilish
              </button>
              <button
                onClick={handleConfirmMultiSubject}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-500/20"
              >
                Ha, Biriktirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
