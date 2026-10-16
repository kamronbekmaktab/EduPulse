import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  FolderPlus,
  X,
  CheckCircle2,
  Phone,
  GraduationCap,
  ChevronRight,
  UserCheck,
  Clock
} from 'lucide-react';
import { db } from '../firebase'; // Firebase sozlama faylingiz manzili
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

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

export default function Classes() {
  const [user] = useState(() => JSON.parse(localStorage.getItem('edupulse_user') || '{}'));
  
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);

  // Firestore'dan ma'lumotlarni yuklab olish
  useEffect(() => {
    loadDataFromFirebase();
  }, []);

  const loadDataFromFirebase = async () => {
    try {
      // 1. Sinflarni yuklash
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClassesList(classesData.length > 0 ? classesData : [
      ]);

      // 2. O'quvchilarni yuklash
      const studentsSnap = await getDocs(collection(db, 'students'));
      setStudentsList(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. O'qituvchilarni yuklash
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      setTeachersList(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    }
  };

  const [activeShiftFilter, setActiveShiftFilter] = useState('all');
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [selectedClassForView, setSelectedClassForView] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const [newClass, setNewClass] = useState({
    gradeNumber: '',
    gradeLetter: '',
    teacherName: '',
    teacherPhone: '+998 ',
    shift: '1-smena'
  });

  const isAdmin = user?.role === 'administrator';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTeacherSelect = (teacherFullName) => {
    const selectedTeacher = teachersList.find(t => (t.full_name || t.fullName) === teacherFullName);
    setNewClass(prev => ({
      ...prev,
      teacherName: teacherFullName || 'Tayinlanmagan',
      teacherPhone: selectedTeacher && (selectedTeacher.phone || selectedTeacher.teacher_phone) ? (selectedTeacher.phone || selectedTeacher.teacher_phone) : '+998 '
    }));
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass.gradeNumber || !newClass.gradeLetter) return;

    const classId = `${newClass.gradeNumber}-${newClass.gradeLetter.toUpperCase()}`;
    const classObj = {
      class_id: classId,
      name: `${classId} sinf`,
      teacher: newClass.teacherName || 'Tayinlanmagan',
      teacherPhone: newClass.teacherPhone.length > 5 ? newClass.teacherPhone : 'Kiritilmagan',
      shift: newClass.shift || '1-smena'
    };

    try {
      // Firestore'ga saqlash
      await setDoc(doc(db, 'classes', classId), classObj);

      setClassesList(prev => [...prev.filter(c => c.id !== classId && c.class_id !== classId), { id: classId, ...classObj }]);
      setNewClass({ gradeNumber: '', gradeLetter: '', teacherName: '', teacherPhone: '+998 ', shift: '1-smena' });
      setIsAddClassOpen(false);
      showToast("Yangi sinf muvaffaqiyatli qo'shildi!");
    } catch (err) {
      console.error("Sinfni qo'shishda xatolik:", err);
      showToast("Xatolik yuz berdi!");
    }
  };

  const filteredClasses = classesList.filter(cls => {
    if (activeShiftFilter === 'all') return true;
    return (cls.shift || '1-smena') === activeShiftFilter;
  });

  const viewStudents = selectedClassForView
    ? studentsList.filter(s => s.grade === selectedClassForView.id || s.grade === selectedClassForView.class_id || s.grade === selectedClassForView.name)
    : [];

  return (
    <div className="px-4 sm:px-8 max-w-7xl mx-auto space-y-6 py-4">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Maktab Sinflari
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Barcha faol sinflar va smenalar ro'yxati
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveShiftFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${activeShiftFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setActiveShiftFilter('1-smena')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${activeShiftFilter === '1-smena'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              1-smena
            </button>
            <button
              onClick={() => setActiveShiftFilter('2-smena')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${activeShiftFilter === '2-smena'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              2-smena
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddClassOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Sinf Qo'shish</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => {
            const classIdVal = cls.id || cls.class_id;
            const studentCount = studentsList.filter(s => s.grade === classIdVal || s.grade === cls.name).length;

            const clsTeacher = cls.teacher || cls.teacher_name;
            const isTeacherExists = teachersList.some(
              t => (t.full_name || t.fullName) && clsTeacher && (t.full_name || t.fullName).trim().toLowerCase() === clsTeacher.trim().toLowerCase()
            );
            const displayTeacher = (isTeacherExists && clsTeacher && clsTeacher !== 'Tayinlanmagan') ? clsTeacher : 'Tayinlanmagan';

            return (
              <div
                key={classIdVal}
                onClick={() => setSelectedClassForView(cls)}
                className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition space-y-3 cursor-pointer group hover:border-blue-300"
              >
                <div className="flex justify-between items-center">
                  <span className="bg-blue-50 text-blue-700 font-black text-sm px-3 py-1 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                    {cls.name || classIdVal}
                  </span>
                  <div className="flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                    <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[11px] font-black">{cls.shift || '1-smena'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 pt-1">
                  <p className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>O'quvchilar soni: <strong className="text-slate-900">{studentCount} ta</strong></span>
                  </p>

                  <p className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span>
                      Sinf rahbari:{' '}
                      <strong className={displayTeacher === 'Tayinlanmagan' ? 'text-rose-500 font-bold' : 'text-slate-900'}>
                        {displayTeacher}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200/80">
            <p className="text-xs text-slate-400 font-bold">Ushbu smenada hali sinflar mavjud emas.</p>
          </div>
        )}
      </div>

      {selectedClassForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedClassForView(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedClassForView.name || selectedClassForView.id} O'quvchilari</h3>
                <p className="text-xs text-slate-500">
                  Rahbar: <strong className="text-slate-800">{selectedClassForView.teacher || selectedClassForView.teacher_name || 'Tayinlanmagan'}</strong> | Smena: <strong className="text-blue-600">{selectedClassForView.shift || '1-smena'}</strong> | Jami: <strong className="text-blue-600">{viewStudents.length} nafar</strong>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {viewStudents.length > 0 ? (
                viewStudents.map((stu, idx) => {
                  const stName = stu.fullName || stu.full_name;
                  const stParent = stu.parentName || stu.parent_name;
                  return (
                    <div key={stu.id || stu.student_id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{stName}</p>
                          <p className="text-[10px] text-slate-400">ID: {stu.id || stu.student_id}</p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 text-right">
                        {stParent && (
                          <p className="text-slate-500 text-[11px]">
                            Ota-onasi: <strong className="text-slate-700">{stParent}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 space-y-2">
                  <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Ushbu sinfga hali o'quvchilar biriktirilmagan.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedClassForView(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition text-xs"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {isAdmin && isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsAddClassOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
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
                <label className="block font-bold text-slate-700 mb-1">O'qish Smenasi</label>
                <select
                  value={newClass.shift}
                  onChange={(e) => setNewClass({ ...newClass, shift: e.target.value })}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold bg-white"
                >
                  <option value="1-smena">1-smena (Ertalabki)</option>
                  <option value="2-smena">2-smena (Tushdan keyingi)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sinf Rahbari Ism-Familiyasi</label>
                <select
                  value={newClass.teacherName}
                  onChange={(e) => handleTeacherSelect(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold bg-white text-slate-800"
                >
                  <option value="">Tayinlanmagan</option>
                  {teachersList.map((t) => {
                    const tName = t.full_name || t.fullName;
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
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95"
              >
                Sinfni Saqlash
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
