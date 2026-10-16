import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FolderPlus,
  ChevronRight,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { db } from '../firebase'; // Firebase sozlama faylingiz manzili
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const formatPhoneNumber = (value) => {
  if (!value) return '+998 ';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  let result = '+998 ';
  if (digits.length > 0) result += digits.slice(0, 2);
  if (digits.length >= 3) result += ' ' + digits.slice(2, 5);
  if (digits.length >= 6) result += ' ' + digits.slice(5, 7);
  if (digits.length >= 8) result += ' ' + digits.slice(7, 9);
  return result;
};

export default function StudentsManagement() {
  const navigate = useNavigate();

  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  // Firestore'dan ma'lumotlarni yuklab olish
  useEffect(() => {
    loadDataFromFirebase();
  }, []);

  const loadDataFromFirebase = async () => {
    try {
      // 1. O'qituvchilarni yuklash
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      setTeachersList(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Sinflarni yuklash
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClassesList(classesData.length > 0 ? classesData : [
      ]);

      // 3. O'quvchilarni yuklash
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentsList(studentsData.length > 0 ? studentsData : [
      ]);
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    }
  };

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClassId, setDeletingClassId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const [newStudent, setNewStudent] = useState({
    fullName: '',
    parentName: '',
    grade: ''
  });

  const [newClass, setNewClass] = useState({
    gradeNumber: '',
    gradeLetter: '',
    teacherName: '',
    teacherPhone: '+998 '
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleNewClassTeacherSelect = (teacherFullName) => {
    const selectedTeacher = teachersList.find(t => (t.fullName || t.full_name) === teacherFullName);
    setNewClass(prev => ({
      ...prev,
      teacherName: teacherFullName || 'Tayinlanmagan',
      teacherPhone: selectedTeacher && (selectedTeacher.phone || selectedTeacher.teacher_phone) ? (selectedTeacher.phone || selectedTeacher.teacher_phone) : '+998 '
    }));
  };

  const handleEditClassTeacherSelect = (teacherFullName) => {
    const selectedTeacher = teachersList.find(t => (t.fullName || t.full_name) === teacherFullName);
    setEditingClass(prev => ({
      ...prev,
      teacher: teacherFullName || 'Tayinlanmagan',
      teacherPhone: selectedTeacher && (selectedTeacher.phone || selectedTeacher.teacher_phone) ? (selectedTeacher.phone || selectedTeacher.teacher_phone) : '+998 '
    }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const targetGrade = newStudent.grade || classesList[0]?.id || classesList[0]?.class_id;
    if (!newStudent.fullName || !targetGrade) return;

    const studentId = `STU-${Date.now().toString().slice(-4)}`;
    const studentObj = {
      student_id: studentId,
      fullName: newStudent.fullName,
      full_name: newStudent.fullName,
      grade: targetGrade,
      parentName: newStudent.parentName || 'Ota-onasi',
      parent_name: newStudent.parentName || 'Ota-onasi'
    };

    try {
      await setDoc(doc(db, 'students', studentId), studentObj);
      setStudentsList(prev => [...prev, { id: studentId, ...studentObj }]);
      setNewStudent({ fullName: '', parentName: '', grade: classesList[0]?.id || classesList[0]?.class_id || '' });
      setIsAddStudentOpen(false);
      showToast("Yangi o'quvchi muvaffaqiyatli qo'shildi!");
    } catch (err) {
      console.error("O'quvchi qo'shishda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass.gradeNumber || !newClass.gradeLetter) return;

    const classId = `${newClass.gradeNumber}-${newClass.gradeLetter.toUpperCase()}`;
    const classObj = {
      class_id: classId,
      name: `${classId} sinf`,
      teacher: newClass.teacherName || 'Tayinlanmagan',
      teacherPhone: newClass.teacherPhone.length > 5 ? newClass.teacherPhone : 'Kiritilmagan'
    };

    try {
      await setDoc(doc(db, 'classes', classId), classObj);
      setClassesList(prev => [...prev.filter(c => c.id !== classId && c.class_id !== classId), { id: classId, ...classObj }]);
      setNewClass({ gradeNumber: '', gradeLetter: '', teacherName: '', teacherPhone: '+998 ' });
      setIsAddClassOpen(false);
      showToast("Yangi sinf muvaffaqiyatli qo'shildi!");
    } catch (err) {
      console.error("Sinf qo'shishda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    const cId = editingClass.id || editingClass.class_id;
    try {
      const payload = {
        class_id: cId,
        name: editingClass.name,
        teacher: editingClass.teacher || 'Tayinlanmagan',
        teacherPhone: editingClass.teacherPhone || 'Kiritilmagan'
      };

      await setDoc(doc(db, 'classes', cId), payload, { merge: true });
      setClassesList(prev => prev.map(c => (c.id === cId || c.class_id === cId) ? { ...c, ...payload } : c));
      setEditingClass(null);
      showToast("Sinf ma'lumotlari yangilandi!");
    } catch (err) {
      console.error("Sinfni yangilashda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  const handleDeleteClass = async () => {
    try {
      await deleteDoc(doc(db, 'classes', deletingClassId));
      setClassesList(prev => prev.filter(c => c.id !== deletingClassId && c.class_id !== deletingClassId));
      setStudentsList(prev => prev.filter(s => s.grade !== deletingClassId));
      setDeletingClassId(null);
      showToast("Sinf va uning o'quvchilari o'chirildi!");
    } catch (err) {
      console.error("Sinfni o'chirishda xatolik:", err);
      showToast("O'chirishda xatolik yuz berdi!");
    }
  };

  return (
    <div className="px-4 py-6 sm:px-8 max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            O'quvchilar Boshqaruvi
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Sinflar ro'yxati va ularni boshqarish
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddClassOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-sm active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Sinf Qo'shish</span>
          </button>

          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>O'quvchi Qo'shish</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classesList.map((cls) => {
          const clsId = cls.id || cls.class_id;
          const count = studentsList.filter(s => s.grade === clsId || s.grade === cls.name).length;

          const clsTeacher = cls.teacher || cls.teacher_name;
          const isTeacherExists = teachersList.some(
            t => (t.fullName || t.full_name) && clsTeacher && (t.fullName || t.full_name).trim().toLowerCase() === clsTeacher.trim().toLowerCase()
          );
          const displayTeacher = (isTeacherExists && clsTeacher && clsTeacher !== 'Tayinlanmagan') ? clsTeacher : 'Tayinlanmagan';
          const displayPhone = isTeacherExists ? (cls.teacherPhone || cls.teacher_phone) : 'Kiritilmagan';

          return (
            <div
              key={clsId}
              className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition space-y-3 relative group"
            >
              <div
                onClick={() => navigate(`/students-management/${clsId}`)}
                className="cursor-pointer space-y-3"
              >
                <div className="flex justify-between items-center pr-16">
                  <span className="bg-blue-50 text-blue-700 font-black text-sm px-3 py-1 rounded-xl">
                    {cls.name || clsId}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>O'quvchilar: <strong className="text-slate-900">{count} ta</strong></p>
                  <p>
                    Sinf rahbari:{' '}
                    <strong className={displayTeacher === 'Tayinlanmagan' ? 'text-rose-500 font-bold' : 'text-slate-900'}>
                      {displayTeacher}
                    </strong>
                  </p>
                  <p className="text-slate-400 text-[11px]">{displayPhone}</p>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex items-center space-x-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingClass(cls); }}
                  className="p-2 bg-slate-50 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 shadow-sm transition active:scale-95"
                  title="Sinfni tahrirlash"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingClassId(clsId); }}
                  className="p-2 bg-slate-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm transition active:scale-95"
                  title="Sinfni o'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAddStudentOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900">Yangi O'quvchi Qo'shish</h3>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ism va Familiya</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Aliyev Samar Botirovich"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ota-onasi F.I.O.</label>
                <input
                  type="text"
                  placeholder="Aliyev Botir"
                  value={newStudent.parentName}
                  onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinfni Tanlang</label>
                <select
                  value={newStudent.grade}
                  onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                  className="w-full p-3 border rounded-xl outline-none font-bold text-slate-700 bg-white"
                >
                  {classesList.map(c => {
                    const cId = c.id || c.class_id;
                    return (
                      <option key={cId} value={cId}>{c.name || cId}</option>
                    );
                  })}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition">
                O'quvchini Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAddClassOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900">Yangi Sinf Qo'shish</h3>

            <form onSubmit={handleAddClass} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sinf Raqami</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 11"
                    value={newClass.gradeNumber}
                    onChange={(e) => setNewClass({ ...newClass, gradeNumber: e.target.value })}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sinf Harfi</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: B"
                    value={newClass.gradeLetter}
                    onChange={(e) => setNewClass({ ...newClass, gradeLetter: e.target.value })}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Rahbari Ismi-Sharifi</label>
                <select
                  value={newClass.teacherName}
                  onChange={(e) => handleNewClassTeacherSelect(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none font-bold text-slate-700 bg-white"
                >
                  <option value="">Tayinlanmagan</option>
                  {teachersList.map(t => {
                    const tName = t.fullName || t.full_name;
                    return (
                      <option key={t.id || tName} value={tName}>
                        {tName} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Rahbari Telefoni</label>
                <input
                  type="text"
                  value={newClass.teacherPhone}
                  onChange={(e) => setNewClass({ ...newClass, teacherPhone: formatPhoneNumber(e.target.value) })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md transition">
                Sinfni Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setEditingClass(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900">Sinf Ma'lumotlarini Tahrirlash</h3>

            <form onSubmit={handleUpdateClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Nomi</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Rahbari Ismi-Sharifi</label>
                <select
                  value={editingClass.teacher || editingClass.teacher_name || ''}
                  onChange={(e) => handleEditClassTeacherSelect(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none font-bold text-slate-700 bg-white"
                >
                  <option value="">Tayinlanmagan</option>
                  {teachersList.map(t => {
                    const tName = t.fullName || t.full_name;
                    return (
                      <option key={t.id || tName} value={tName}>
                        {tName} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Rahbari Telefoni</label>
                <input
                  type="text"
                  value={editingClass.teacherPhone || editingClass.teacher_phone || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, teacherPhone: formatPhoneNumber(e.target.value) })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition">
                O'zgarishlarni Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {deletingClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Sinfni o'chirasizmi?</h3>
              <p className="text-xs text-slate-500 mt-1">Bu sinfga tegishli barcha o'quvchilar ham ro'yxatdan o'chib ketadi.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeletingClassId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition">
                Bekor qilish
              </button>
              <button onClick={handleDeleteClass} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-rose-500/20">
                Ha, O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
