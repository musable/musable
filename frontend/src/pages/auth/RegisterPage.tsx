import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { RegisterData } from '../../types';
import toast from 'react-hot-toast';

const schema = yup.object().shape({
  username: yup
    .string()
    .matches(/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  inviteToken: yup.string().required('Invite token is required'),
});

type RegisterFormData = RegisterData & { confirmPassword: string };

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { register: registerUser, isLoading, error, clearError, validateInvite } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema) as any,
  });

  const inviteToken = watch('inviteToken');

  // Set invite token from URL if available (supports both path param and query param)
  useEffect(() => {
    const inviteFromPath = token; // URL path parameter: /register/:token
    const inviteFromQuery = searchParams.get('invite'); // URL query parameter: ?invite=...
    
    const inviteToken = inviteFromPath || inviteFromQuery;
    
    if (inviteToken) {
      setValue('inviteToken', inviteToken);
    }
  }, [token, searchParams, setValue]);

  // Validate invite token
  useEffect(() => {
    if (inviteToken && inviteToken.length >= 36) { // UUID length
      validateInvite(inviteToken).then(setInviteValid);
    } else {
      setInviteValid(null);
    }
  }, [inviteToken, validateInvite]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    if (!inviteValid) {
      toast.error('Please provide a valid invite token');
      return;
    }

    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      toast.success('Welcome to Musable!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">
          Join Musable
        </h2>
        <p className="mt-2 text-gray-400">
          Create your account and start enjoying your music.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="inviteToken" className="block text-sm font-medium text-gray-300 mb-2">
            Invite Token
          </label>
          <div className="relative">
            <input
              {...register('inviteToken')}
              type="text"
              className="input-primary w-full pr-10"
              placeholder="Enter your invite token"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {inviteToken && inviteToken.length >= 36 && (
                inviteValid ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                ) : inviteValid === false ? (
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                )
              )}
            </div>
          </div>
          {errors.inviteToken && (
            <p className="mt-1 text-sm text-red-400">{errors.inviteToken.message}</p>
          )}
          {inviteValid === false && (
            <p className="mt-1 text-sm text-red-400">Invalid or expired invite token</p>
          )}
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            {...register('username')}
            type="text"
            autoComplete="username"
            className="input-primary w-full"
            placeholder="Choose a username"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email address
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="input-primary w-full"
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input-primary w-full pr-10"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input-primary w-full pr-10"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !inviteValid}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="text-center">
        <p className="text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-secondary font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;