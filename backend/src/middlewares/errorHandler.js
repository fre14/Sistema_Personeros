export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err;
  }

  res.status(statusCode).json(response);
};
