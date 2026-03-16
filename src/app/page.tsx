import { redirect } from 'next/navigation';

export default function Home() {
  // 루트 경로 접속 시 로그인 페이지로 리다이렉트
  redirect('/login');
}

