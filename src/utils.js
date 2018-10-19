import moment from 'moment';
import winston from 'winston';

export const logger = (() => {
	const timestamp = winston.format(info => {
		info.timestamp = moment().format();
		return info;
	});

	return winston.createLogger({
		level: process.env.NODE_ENV === 'debug' ? 'debug' : 'info',
		format: winston.format.combine(
			timestamp(),
			winston.format.printf(i => `${i.timestamp} - ${i.level}: ${i.message}`)
		),
		transports: [
			new winston.transports.Console()
		]
	});
})();
