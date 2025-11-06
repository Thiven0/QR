import { useState } from 'react';
import PropTypes from 'prop-types';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Input = ({ type, value, onChange, placeholder, name, ...rest }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#00594e]">{placeholder}</span>
      <div className="relative">
        <input
          type={resolvedType}
          className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm transition placeholder:text-slate-400 focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70 ${
            isPassword ? 'pr-10' : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={name}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-[#00594e] focus:outline-none"
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
};

Input.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  name: PropTypes.string,
};

export default Input;
