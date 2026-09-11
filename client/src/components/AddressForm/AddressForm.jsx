import React, { useState } from 'react';
import './AddressForm.css';

const emptyForm = {
  full_name: '',
  phone: '',
  address_line: '',
  city: '',
  state: '',
  pincode: '',
  label: 'home',
};

function AddressForm({ initialValues = {}, submitLabel = 'Save Address', onSubmit, onCancel }) {
  const [form, setForm] = useState({
    full_name: initialValues.full_name || '',
    phone: initialValues.phone || '',
    address_line: initialValues.address_line || '',
    city: initialValues.city || '',
    state: initialValues.state || '',
    pincode: initialValues.pincode || '',
    label: initialValues.label || 'home',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('');

    try {
      await onSubmit(form);
      setForm(emptyForm);
    } catch {
      setStatusMessage('Could not save the address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Full Name</span>
          <input
            name="full_name"
            type="text"
            autoComplete="name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Your full name"
            required
          />
        </label>

        <label className="form-field">
          <span>Phone Number</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            required
          />
        </label>

        <label className="form-field form-field-full">
          <span>Address</span>
          <input
            name="address_line"
            type="text"
            autoComplete="street-address"
            value={form.address_line}
            onChange={handleChange}
            placeholder="House no, street, area"
            required
          />
        </label>

        <label className="form-field">
          <span>City</span>
          <input
            name="city"
            type="text"
            autoComplete="address-level2"
            value={form.city}
            onChange={handleChange}
            placeholder="Your city"
            required
          />
        </label>

        <label className="form-field">
          <span>State</span>
          <input
            name="state"
            type="text"
            autoComplete="address-level1"
            value={form.state}
            onChange={handleChange}
            placeholder="Your state"
            required
          />
        </label>

        <label className="form-field">
          <span>Pincode</span>
          <input
            name="pincode"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={form.pincode}
            onChange={handleChange}
            placeholder="6-digit pincode"
            required
          />
        </label>

        <label className="form-field">
          <span>Label</span>
          <select name="label" value={form.label} onChange={handleChange}>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      {statusMessage && <p className="address-form-status">{statusMessage}</p>}

      <div className="address-form-actions">
        <button type="submit" className="address-form-save" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        <button type="button" className="address-form-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
