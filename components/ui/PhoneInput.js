import { useState, useEffect, useRef } from 'react';
import StyledSelect from './StyledSelect';

const COUNTRY_CODES = [
  { value: '+91', name: '+91 (India)' },
  { value: '+1', name: '+1 (USA/Canada)' },
  { value: '+44', name: '+44 (UK)' },
  { value: '+61', name: '+61 (Australia)' },
  { value: '+49', name: '+49 (Germany)' },
  { value: '+33', name: '+33 (France)' },
  { value: '+81', name: '+81 (Japan)' },
  { value: '+86', name: '+86 (China)' },
  { value: '+971', name: '+971 (UAE)' },
  { value: '+65', name: '+65 (Singapore)' },
  { value: '+60', name: '+60 (Malaysia)' },
  { value: '+66', name: '+66 (Thailand)' },
  { value: '+62', name: '+62 (Indonesia)' },
  { value: '+84', name: '+84 (Vietnam)' },
  { value: '+63', name: '+63 (Philippines)' },
  { value: '+92', name: '+92 (Pakistan)' },
  { value: '+880', name: '+880 (Bangladesh)' },
  { value: '+94', name: '+94 (Sri Lanka)' },
  { value: '+977', name: '+977 (Nepal)' },
];

export default function PhoneInput({ 
  value = '', 
  onChange, 
  countryCode: initialCountryCode = '+91',
  placeholder = 'Phone number',
  className = ''
}) {
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState('');
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);

  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // Parse existing value to extract country code and number (only on initial mount or when value changes externally)
    if (value) {
      const codeMatch = COUNTRY_CODES.find(cc => value.startsWith(cc.value));
      if (codeMatch) {
        setCountryCode(codeMatch.value);
        setPhoneNumber(value.replace(codeMatch.value, '').trim());
      } else if (isInitialMount.current) {
        setPhoneNumber(value);
      }
    } else if (isInitialMount.current) {
      setPhoneNumber('');
    }
    isInitialMount.current = false;
  }, [value]);

  const handleCountryCodeChange = (val) => {
    setCountryCode(val);
    const fullNumber = phoneNumber ? `${val} ${phoneNumber}` : '';
    if (onChangeRef.current) {
      onChangeRef.current(fullNumber);
    }
  };

  const handlePhoneNumberChange = (e) => {
    const newNumber = e.target.value.replace(/\D/g, '');
    setPhoneNumber(newNumber);
    const fullNumber = newNumber ? `${countryCode} ${newNumber}` : '';
    if (onChangeRef.current) {
      onChangeRef.current(fullNumber);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="w-32">
        <StyledSelect
          value={countryCode}
          onChange={handleCountryCodeChange}
          options={COUNTRY_CODES}
          placeholder="Code"
          className="w-full"
        />
      </div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

