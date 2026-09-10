import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const LoginPage = () => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }
    setLoading(true);
    try {
      const user = await login(dni, password);
      if (user.rol === 'admin') navigate('/admin/dashboard');
      else if (user.rol === 'coordinador') navigate('/coordinador/mis-locales');
      else if (user.rol === 'personero') navigate('/personero/mi-mesa');
    } catch (error) {
      // Error handled in context with toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Sistema Electoral
        </h2>
        <p className="mt-2 text-center text-sm text-blue-200">
          Huamanga 2026
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="DNI"
              type="text"
              required
              maxLength="8"
              pattern="\d{8}"
              title="Debe contener 8 dígitos numéricos"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="Ingrese su DNI"
            />

            <Input
              label="Contraseña / Número de Mesa"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña o N° de mesa asignada"
            />
            <p className="text-xs text-gray-500 -mt-3">
              💡 <strong>Personeros:</strong> Pueden ingresar colocando su número de mesa como contraseña.
            </p>

            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
            >
              Iniciar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
