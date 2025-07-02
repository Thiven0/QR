import PropTypes from 'prop-types';

const Input = ({ type, value, onChange, placeholder, name}) => (
  <div>
    <label className="block text-[#00594e]">{placeholder}</label>
    <input
      type={type}
      className="w-full p-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054E] after:content-['*']"
      placeholder={type}
      value={value}
      onChange={onChange}
      name={name}
    />
  </div>
);

Input.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  name: PropTypes.string,
};

export default Input;
