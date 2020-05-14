const formatLog = (from, to, limit, log) => {
  const _from = from ? new Date(from) : undefined;
  const _to = to ? new Date(to) : undefined;

  // Filters the log array by from date and to date
  const filteredLog = log
    .filter((logObject) => {
      return _from ? logObject.date >= _from : logObject;
    })
    .filter((logObject) => {
      return _to ? logObject.date <= _to : logObject;
    });

  // Limits the log array size
  if (limit) {
    filteredLog.splice(0, filteredLog.length - +limit);
  }

  // Formats the date
  const formattedLog = filteredLog.map((logObject) => ({
    description: logObject.description,
    duration: logObject.duration,
    date: logObject.date.toDateString(),
  }));

  return { _from, _to, formattedLog };
};

module.exports = formatLog;
