import { Router } from 'express';

const router = Router();

// temporary code
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: { schedules: [] },
    message: '스케줄 목록 조회',
  });
});

export default router;