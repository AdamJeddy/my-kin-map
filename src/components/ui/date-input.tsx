import { useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

type DatePrecision = 'full' | 'month' | 'year';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function DateInput({ value = '', onChange, placeholder, className }: DateInputProps) {
  // Parse existing value to determine precision and parts
  const parseDate = (dateStr: string): { precision: DatePrecision; year: string; month: string; day: string } => {
    if (!dateStr) return { precision: 'full', year: '', month: '', day: '' };
    
    // Try to match different formats
    // Full date: YYYY-MM-DD or DD MMM YYYY
    const fullDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (fullDateMatch) {
      return { precision: 'full', year: fullDateMatch[1], month: fullDateMatch[2], day: fullDateMatch[3] };
    }
    
    const textDateMatch = dateStr.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
    if (textDateMatch) {
      const monthIndex = MONTH_SHORT.indexOf(textDateMatch[2]);
      if (monthIndex >= 0) {
        return { 
          precision: 'full', 
          year: textDateMatch[3], 
          month: String(monthIndex + 1).padStart(2, '0'), 
          day: textDateMatch[1].padStart(2, '0') 
        };
      }
    }
    
    // Month and year: MMM YYYY or YYYY-MM
    const monthYearMatch = dateStr.match(/^(\w{3})\s+(\d{4})$/);
    if (monthYearMatch) {
      const monthIndex = MONTH_SHORT.indexOf(monthYearMatch[1]);
      if (monthIndex >= 0) {
        return { 
          precision: 'month', 
          year: monthYearMatch[2], 
          month: String(monthIndex + 1).padStart(2, '0'), 
          day: '' 
        };
      }
    }
    
    const yearMonthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
    if (yearMonthMatch) {
      return { precision: 'month', year: yearMonthMatch[1], month: yearMonthMatch[2], day: '' };
    }
    
    // Year only: YYYY
    const yearMatch = dateStr.match(/^(\d{4})$/);
    if (yearMatch) {
      return { precision: 'year', year: yearMatch[1], month: '', day: '' };
    }
    
    // Default to year precision for partial data
    return { precision: 'year', year: dateStr, month: '', day: '' };
  };

  const initialParsed = parseDate(value);
  const [precision, setPrecision] = useState<DatePrecision>(initialParsed.precision);
  const [year, setYear] = useState(initialParsed.year);
  const [month, setMonth] = useState(initialParsed.month);
  const [day, setDay] = useState(initialParsed.day);

  const formatDate = useCallback((prec: DatePrecision, y: string, m: string, d: string): string => {
    if (!y) return '';
    
    if (prec === 'year') {
      return y;
    }
    
    if (prec === 'month') {
      if (!m) return y;
      const monthIndex = parseInt(m) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${MONTH_SHORT[monthIndex]} ${y}`;
      }
      return y;
    }
    
    if (prec === 'full') {
      if (!m || !d) return y;
      const monthIndex = parseInt(m) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${parseInt(d)} ${MONTH_SHORT[monthIndex]} ${y}`;
      }
      return y;
    }
    
    return y;
  }, []);

  const updateValue = useCallback((newPrecision: DatePrecision, newYear: string, newMonth: string, newDay: string) => {
    const formatted = formatDate(newPrecision, newYear, newMonth, newDay);
    onChange(formatted);
  }, [formatDate, onChange]);

  const handlePrecisionChange = useCallback((newPrecision: DatePrecision) => {
    setPrecision(newPrecision);
    updateValue(newPrecision, year, month, day);
  }, [year, month, day, updateValue]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value;
    setYear(newYear);
    updateValue(precision, newYear, month, day);
  }, [precision, month, day, updateValue]);

  const handleMonthChange = useCallback((newMonth: string) => {
    setMonth(newMonth);
    updateValue(precision, year, newMonth, day);
  }, [precision, year, day, updateValue]);

  const handleDayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDay = e.target.value;
    setDay(newDay);
    updateValue(precision, year, month, newDay);
  }, [precision, year, month, updateValue]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Select value={precision} onValueChange={handlePrecisionChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Full Date</span>
              </div>
            </SelectItem>
            <SelectItem value="month">Month/Year</SelectItem>
            <SelectItem value="year">Year Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Year input */}
        <Input
          type="number"
          value={year}
          onChange={handleYearChange}
          placeholder="Year"
          min="1800"
          max={currentYear}
          className="flex-1"
        />
      </div>

      {/* Month and day inputs for higher precision */}
      {(precision === 'month' || precision === 'full') && (
        <div className="flex gap-2">
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((monthName, index) => (
                <SelectItem key={index} value={String(index + 1).padStart(2, '0')}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {precision === 'full' && (
            <Input
              type="number"
              value={day}
              onChange={handleDayChange}
              placeholder="Day"
              min="1"
              max="31"
              className="w-20"
            />
          )}
        </div>
      )}
    </div>
  );
}
