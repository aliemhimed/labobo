import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import '../../styles/live.css';

/* Labobo Live routes (all signed in; see App.jsx).
     /live                       join a room by code, past sessions (students)
     /live/play/:room            a student's phone in a room
     /live/results/:room         results of a finished room (teacher or student)
     /live/screen/:room          the projector view (opened by the teacher)
     /live/host                  pass holders: quick setup for a game with friends
     /live/teach                 teacher home: quizzes and past rooms
     /live/teach/quiz/new        quiz builder (new)
     /live/teach/quiz/:id        quiz builder (edit)
     /live/teach/start/:id       room setup screen for a saved quiz
     /live/teach/room/:room      the teacher's control view
     /live/teach/cases/new       case set builder (new)
     /live/teach/cases/:id       case set builder (edit)
     /live/teach/cases/start/:id case room setup for a saved case set */
const LiveHome = lazy(() => import('./LiveHome.jsx'));
const PlayerRoom = lazy(() => import('./PlayerRoom.jsx'));
const Results = lazy(() => import('./Results.jsx'));
const Projector = lazy(() => import('./Projector.jsx'));
const TeacherHome = lazy(() => import('./TeacherHome.jsx'));
const QuizBuilder = lazy(() => import('./QuizBuilder.jsx'));
const RoomSetup = lazy(() => import('./RoomSetup.jsx'));
const HostRoom = lazy(() => import('./HostRoom.jsx'));
const CaseSetBuilder = lazy(() => import('./CaseSetBuilder.jsx'));
const CaseSetup = lazy(() => import('./CaseSetup.jsx'));
const HostSetup = lazy(() => import('./HostSetup.jsx'));

export default function LiveApp() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<LiveHome />} />
        <Route path="play/:room" element={<PlayerRoom />} />
        <Route path="results/:room" element={<Results />} />
        <Route path="screen/:room" element={<Projector />} />
        <Route path="host" element={<HostSetup />} />
        <Route path="teach" element={<TeacherHome />} />
        <Route path="teach/quiz/new" element={<QuizBuilder />} />
        <Route path="teach/quiz/:id" element={<QuizBuilder />} />
        <Route path="teach/start/:id" element={<RoomSetup />} />
        <Route path="teach/room/:room" element={<HostRoom />} />
        <Route path="teach/cases/new" element={<CaseSetBuilder />} />
        <Route path="teach/cases/start/:id" element={<CaseSetup />} />
        <Route path="teach/cases/:id" element={<CaseSetBuilder />} />
        <Route path="*" element={<Navigate to="/live" replace />} />
      </Routes>
    </Suspense>
  );
}
