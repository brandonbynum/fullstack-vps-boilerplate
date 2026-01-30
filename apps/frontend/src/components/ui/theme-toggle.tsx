import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative"
      title={
        theme === 'system'
          ? `System theme (${actualTheme})`
          : `${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`
      }
    >
      {actualTheme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
      {theme === 'system' && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </Button>
  );
}
