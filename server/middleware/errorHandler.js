// Globalny handler błędów zwraca spójny format odpowiedzi JSON.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[SERVER_ERROR]', err);
  }

  res.status(statusCode).json({
    message: err.message || 'Wystapił nieoczekiwany bład serwera',
  });
}

module.exports = errorHandler;

