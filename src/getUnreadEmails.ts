import { connect } from 'imap-simple';

export async function getUnreadCount(config: any) {
  try {
    const connection = await connect({
      imap: {
        user: config.username,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: config.tls,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000,
      }
    });

    await connection.openBox('INBOX');
    
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    connection.end();
    
    return messages.length;
  } catch (err) {
    console.error("IMAP error:", err);
    return 0;
  }
}
