import { useState } from 'react';
import { User, Mail, Phone, Users } from 'lucide-react';

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  infants: number;
}

interface GuestInfoFormProps {
  initialData?: Partial<GuestInfo>;
  onSubmit: (guestInfo: GuestInfo) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export default function GuestInfoForm({
  initialData,
  onSubmit,
  onBack,
  isLoading = false,
}: GuestInfoFormProps) {
  const [formData, setFormData] = useState<GuestInfo>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    adults: initialData?.adults || 1,
    children: initialData?.children || 0,
    infants: initialData?.infants || 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but validated if provided)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    // Guest count validation
    const totalGuests = formData.adults + formData.children + formData.infants;
    if (totalGuests === 0) {
      newErrors.adults = 'At least one guest is required';
    }
    if (formData.adults === 0 && (formData.children > 0 || formData.infants > 0)) {
      newErrors.adults = 'At least one adult is required when booking for children/infants';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof GuestInfo, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const totalGuests = formData.adults + formData.children + formData.infants;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Guest Information</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
            Contact Details
          </h3>

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="john@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="+31 6 12345678"
                disabled={isLoading}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Guest Count Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
            Number of Guests
          </h3>

          <div className="bg-blue-50 p-4 rounded-md flex items-start">
            <Users className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Total Guests: {totalGuests}</p>
              <p className="text-xs text-blue-600 mt-1">
                Children: Ages 3-12 | Infants: Under 3 years
              </p>
            </div>
          </div>

          {/* Adults Counter */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Adults <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">Ages 13 and above</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleChange('adults', Math.max(0, formData.adults - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.adults <= 0 || isLoading}
              >
                -
              </button>
              <span className="w-8 text-center font-semibold">{formData.adults}</span>
              <button
                type="button"
                onClick={() => handleChange('adults', Math.min(20, formData.adults + 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.adults >= 20 || isLoading}
              >
                +
              </button>
            </div>
          </div>
          {errors.adults && (
            <p className="text-sm text-red-600">{errors.adults}</p>
          )}

          {/* Children Counter */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Children</label>
              <p className="text-xs text-gray-500">Ages 3-12</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleChange('children', Math.max(0, formData.children - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.children <= 0 || isLoading}
              >
                -
              </button>
              <span className="w-8 text-center font-semibold">{formData.children}</span>
              <button
                type="button"
                onClick={() => handleChange('children', Math.min(20, formData.children + 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.children >= 20 || isLoading}
              >
                +
              </button>
            </div>
          </div>

          {/* Infants Counter */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Infants</label>
              <p className="text-xs text-gray-500">Under 3 years</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleChange('infants', Math.max(0, formData.infants - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.infants <= 0 || isLoading}
              >
                -
              </button>
              <span className="w-8 text-center font-semibold">{formData.infants}</span>
              <button
                type="button"
                onClick={() => handleChange('infants', Math.min(20, formData.infants + 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.infants >= 20 || isLoading}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Back
            </button>
          )}
          <button
            type="submit"
            className={`px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              !onBack ? 'ml-auto' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
