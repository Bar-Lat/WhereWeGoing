import { Redirect } from 'expo-router';

export default function Index() {
  // tu nic nie ma, on tylko przekierowuje do welcome.tsx 
  // lub w przyszlosci dashboard.tsx, w zależności od tego czy użytkownik jest zalogowany czy nie
  
  // od razu przekierowuje do welcome.tsx wewnątrz grupy (auth)
  return <Redirect href="/(auth)/welcome" />;
}