const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api' + path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function verify() {
  console.log('=== Step 1: Register User ===');
  const email = `scrum_${Date.now()}@agile.com`;
  const reg = await request('POST', '/auth/register', {
    name: 'Scrum Lead',
    email,
    password: 'password123',
    orgName: 'Velocity Org'
  });
  const token = reg.body.token;
  const projectId = reg.body.project._id;

  console.log('\n=== Step 2: Get Active Sprint Initial Story Points ===');
  let sprintsRes = await request('GET', `/projects/${projectId}/sprints`, null, token);
  let activeSprint = sprintsRes.body.data.find(s => s.status === 'active');
  console.log('Initial Active Sprint Story Points:', activeSprint.metrics.completedPoints, '/', activeSprint.metrics.totalPoints);

  console.log('\n=== Step 3: Create Backlog Task with 5 Story Points ===');
  const taskRes = await request('POST', `/projects/${projectId}/tasks`, {
    title: 'Migrate caching layer to Redis cluster',
    status: 'backlog',
    sprint: null,
    storyPoints: 5
  }, token);
  const taskId = taskRes.body.task._id;
  console.log('Created Backlog Task:', taskRes.body.task.taskNumber, 'Points:', taskRes.body.task.storyPoints);

  console.log('\n=== Step 4: Pull Backlog Task into Active Sprint ===');
  const moveRes = await request('POST', `/projects/${projectId}/sprints/active/move-tasks`, {
    taskIds: [taskId]
  }, token);
  console.log('Pull task to active sprint:', moveRes.status, moveRes.body?.message);

  sprintsRes = await request('GET', `/projects/${projectId}/sprints`, null, token);
  activeSprint = sprintsRes.body.data.find(s => s.status === 'active');
  console.log('Active Sprint Story Points after pulling backlog task:', activeSprint.metrics.completedPoints, '/', activeSprint.metrics.totalPoints);

  console.log('\n=== Step 5: Complete the Task (status -> done) ===');
  const completeRes = await request('PATCH', `/projects/${projectId}/tasks/${taskId}/status`, {
    status: 'done'
  }, token);
  console.log('Complete task result:', completeRes.status, completeRes.body?.task?.status);

  sprintsRes = await request('GET', `/projects/${projectId}/sprints`, null, token);
  activeSprint = sprintsRes.body.data.find(s => s.status === 'active');
  console.log('Active Sprint Story Points after completing task:', activeSprint.metrics.completedPoints, '/', activeSprint.metrics.totalPoints);

  console.log('\n=== Step 6: Update Story Points from 5 to 8 ===');
  const updatePtsRes = await request('PUT', `/projects/${projectId}/tasks/${taskId}`, {
    storyPoints: 8
  }, token);
  console.log('Update story points result:', updatePtsRes.status, updatePtsRes.body?.task?.storyPoints);

  sprintsRes = await request('GET', `/projects/${projectId}/sprints`, null, token);
  activeSprint = sprintsRes.body.data.find(s => s.status === 'active');
  console.log('Active Sprint Story Points after story points change:', activeSprint.metrics.completedPoints, '/', activeSprint.metrics.totalPoints);

  console.log('\n=== VERIFICATION FINISHED SUCCESSFULLY ===');
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
