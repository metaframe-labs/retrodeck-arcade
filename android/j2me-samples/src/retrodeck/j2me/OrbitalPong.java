/*
 * Orbital Pong - Open Source J2ME Arcade Game (MIT License)
 * Built for RetroDeck OS embedded J2ME (MIDP 2.0 / CLDC 1.1)
 */
package retrodeck.j2me;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Display;
import javax.microedition.lcdui.Font;
import javax.microedition.lcdui.Graphics;
import javax.microedition.midlet.MIDlet;
import javax.microedition.rms.RecordStore;

public class OrbitalPong extends MIDlet {
    private PongCanvas canvas;
    private boolean started = false;

    public void startApp() {
        if (!started) {
            started = true;
            canvas = new PongCanvas(this);
            Display.getDisplay(this).setCurrent(canvas);
            canvas.startLoop();
        } else if (canvas != null) {
            canvas.resumeLoop();
        }
    }

    public void pauseApp() {
        if (canvas != null) canvas.pauseLoop();
    }

    public void destroyApp(boolean unconditional) {
        if (canvas != null) canvas.stopLoop();
    }

    void exitGame() {
        destroyApp(true);
        notifyDestroyed();
    }

    private static final class PongCanvas extends Canvas implements Runnable {
        private static final String RMS_NAME = "pong_save";
        private final OrbitalPong midlet;
        private final Font smallFont = Font.getFont(Font.FACE_MONOSPACE, Font.STYLE_BOLD, Font.SIZE_SMALL);
        private final Font bigFont = Font.getFont(Font.FACE_MONOSPACE, Font.STYLE_BOLD, Font.SIZE_LARGE);

        private volatile boolean running = false;
        private volatile boolean paused = false;
        private int screenState = 0; // 0 = title, 1 = playing, 2 = pause/exit menu, 3 = match over
        private int menuIdx = 0;

        private int playerX = 120;
        private int aiX = 120;
        private int ballX = 120;
        private int ballY = 160;
        private int vx = 3;
        private int vy = 4;
        private int pScore = 0;
        private int aiScore = 0;
        private int streak = 0;
        private int bestStreak = 0;
        private int rallyCount = 0;

        private boolean holdLeft, holdRight;

        private final int[] trailX = new int[5];
        private final int[] trailY = new int[5];

        PongCanvas(OrbitalPong midlet) {
            this.midlet = midlet;
            setFullScreenMode(true);
            loadBestStreak();
            resetMatch();
        }

        private void loadBestStreak() {
            RecordStore rs = null;
            try {
                rs = RecordStore.openRecordStore(RMS_NAME, true);
                if (rs.getNumRecords() > 0) {
                    byte[] data = rs.getRecord(1);
                    if (data != null && data.length >= 4) {
                        bestStreak = ((data[0] & 0xFF) << 24)
                                | ((data[1] & 0xFF) << 16)
                                | ((data[2] & 0xFF) << 8)
                                | (data[3] & 0xFF);
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                if (rs != null) {
                    try { rs.closeRecordStore(); } catch (Throwable ignored) {}
                }
            }
        }

        private void saveBestStreak() {
            if (streak <= bestStreak) return;
            bestStreak = streak;
            RecordStore rs = null;
            try {
                rs = RecordStore.openRecordStore(RMS_NAME, true);
                byte[] data = new byte[] {
                    (byte) (bestStreak >>> 24),
                    (byte) (bestStreak >>> 16),
                    (byte) (bestStreak >>> 8),
                    (byte) bestStreak
                };
                if (rs.getNumRecords() == 0) {
                    rs.addRecord(data, 0, data.length);
                } else {
                    rs.setRecord(1, data, 0, data.length);
                }
            } catch (Throwable ignored) {
            } finally {
                if (rs != null) {
                    try { rs.closeRecordStore(); } catch (Throwable ignored) {}
                }
            }
        }

        private void resetMatch() {
            int w = Math.max(128, getWidth());
            playerX = w / 2;
            aiX = w / 2;
            pScore = 0;
            aiScore = 0;
            serveBall(true);
        }

        private void serveBall(boolean toPlayer) {
            int w = Math.max(128, getWidth());
            int h = Math.max(128, getHeight());
            ballX = w / 2;
            ballY = h / 2;
            vx = (rallyCount % 2 == 0) ? 3 : -3;
            vy = toPlayer ? 4 : -4;
            rallyCount = 0;
            for (int i = 0; i < trailX.length; i++) {
                trailX[i] = ballX;
                trailY[i] = ballY;
            }
        }

        void startLoop() {
            if (running) return;
            running = true;
            paused = false;
            new Thread(this).start();
        }

        void pauseLoop() { paused = true; }
        void resumeLoop() { paused = false; }
        void stopLoop() { running = false; }

        public void run() {
            while (running) {
                long t0 = System.currentTimeMillis();
                if (!paused) {
                    tick();
                    repaint();
                    serviceRepaints();
                }
                long dt = System.currentTimeMillis() - t0;
                long sleepMs = Math.max(12, 28 - dt);
                try {
                    Thread.sleep(sleepMs);
                } catch (InterruptedException ignored) {
                }
            }
        }

        private void tick() {
            if (screenState != 1) return;

            int w = Math.max(128, getWidth());
            int h = Math.max(128, getHeight());
            int padW = 48;
            int halfPad = padW / 2;

            if (holdLeft) playerX -= 6;
            if (holdRight) playerX += 6;
            if (playerX < halfPad + 4) playerX = halfPad + 4;
            if (playerX > w - halfPad - 4) playerX = w - halfPad - 4;

            // Smart AI tracking
            int aiSpd = 4 + Math.min(2, pScore / 3);
            if (aiX < ballX - 4) aiX += aiSpd;
            else if (aiX > ballX + 4) aiX -= aiSpd;
            if (aiX < halfPad + 4) aiX = halfPad + 4;
            if (aiX > w - halfPad - 4) aiX = w - halfPad - 4;

            // Trail history
            for (int i = trailX.length - 1; i > 0; i--) {
                trailX[i] = trailX[i - 1];
                trailY[i] = trailY[i - 1];
            }
            trailX[0] = ballX;
            trailY[0] = ballY;

            ballX += vx;
            ballY += vy;

            if (ballX <= 6) {
                ballX = 6;
                vx = Math.abs(vx);
            } else if (ballX >= w - 6) {
                ballX = w - 6;
                vx = -Math.abs(vx);
            }

            int aiY = 34;
            int playerY = h - 22;

            // Player paddle hit
            if (vy > 0 && ballY >= playerY - 6 && ballY <= playerY + 6 && Math.abs(ballX - playerX) <= halfPad + 5) {
                ballY = playerY - 6;
                rallyCount++;
                int offset = (ballX - playerX) / 6;
                vx = Math.max(-6, Math.min(6, offset == 0 ? (vx > 0 ? 2 : -2) : offset));
                vy = -Math.min(7, 4 + rallyCount / 4);
            }

            // AI paddle hit
            if (vy < 0 && ballY <= aiY + 6 && ballY >= aiY - 6 && Math.abs(ballX - aiX) <= halfPad + 5) {
                ballY = aiY + 6;
                rallyCount++;
                int offset = (ballX - aiX) / 7;
                vx = Math.max(-6, Math.min(6, offset == 0 ? (vx > 0 ? 2 : -2) : offset));
                vy = Math.min(7, 4 + rallyCount / 4);
            }

            if (ballY < 20) {
                pScore++;
                if (pScore >= 7) {
                    streak++;
                    saveBestStreak();
                    screenState = 3;
                    menuIdx = 0;
                    return;
                }
                serveBall(false);
            } else if (ballY > h + 4) {
                aiScore++;
                if (aiScore >= 7) {
                    streak = 0;
                    screenState = 3;
                    menuIdx = 0;
                    return;
                }
                serveBall(true);
            }
        }

        protected void paint(Graphics g) {
            int w = getWidth();
            int h = getHeight();

            g.setColor(0x030712);
            g.fillRect(0, 0, w, h);

            // Cyber center court lines
            g.setColor(0x1E293B);
            g.drawLine(0, h / 2, w, h / 2);
            g.drawArc(w / 2 - 28, h / 2 - 28, 56, 56, 0, 360);

            // HUD
            g.setColor(0x0F172A);
            g.fillRect(0, 0, w, 20);
            g.setColor(0x22D3EE);
            g.drawLine(0, 20, w, 20);
            g.setFont(smallFont);
            g.setColor(0xF43F5E);
            g.drawString("CPU:" + aiScore, 6, 3, Graphics.TOP | Graphics.LEFT);
            g.setColor(0xFACC15);
            g.drawString("STRK:" + streak + "/" + bestStreak, w / 2, 3, Graphics.TOP | Graphics.HCENTER);
            g.setColor(0x22D3EE);
            g.drawString("YOU:" + pScore, w - 6, 3, Graphics.TOP | Graphics.RIGHT);

            // Paddles
            g.setColor(0xF43F5E);
            g.fillRoundRect(aiX - 24, 30, 48, 8, 4, 4);
            g.setColor(0x22D3EE);
            g.fillRoundRect(playerX - 24, h - 24, 48, 8, 4, 4);

            // Ball trail + ball
            for (int i = trailX.length - 1; i >= 0; i--) {
                g.setColor(i < 2 ? 0x38BDF8 : 0x1D4ED8);
                int r = Math.max(2, 6 - i);
                g.fillArc(trailX[i] - r / 2, trailY[i] - r / 2, r, r, 0, 360);
            }
            g.setColor(0xFFFFFF);
            g.fillArc(ballX - 5, ballY - 5, 10, 10, 0, 360);

            if (screenState == 0) {
                drawMenu(g, w, h, "ORBITAL PONG", "BEST STREAK: " + bestStreak, "[A]/[5] PLAY", "EXIT: BACK/SOFT", "");
            } else if (screenState == 2 || screenState == 3) {
                String title = screenState == 2 ? "PAUSED" : (pScore >= 7 ? "YOU WIN!" : "CPU WINS");
                String sub = "SCORE " + pScore + " - " + aiScore + "  BEST:" + bestStreak;
                String o0 = (menuIdx == 0 ? "> " : "  ") + (screenState == 2 ? "RESUME" : "PLAY AGAIN");
                String o1 = (menuIdx == 1 ? "> " : "  ") + (screenState == 2 ? "RESTART" : "EXIT TO OS");
                drawMenu(g, w, h, title, sub, o0, o1, screenState == 2 ? (menuIdx == 2 ? "> EXIT TO OS" : "  EXIT TO OS") : "");
            }
        }

        private void drawMenu(Graphics g, int w, int h, String title, String sub, String o0, String o1, String o2) {
            int bw = Math.min(w - 24, 196);
            int bh = 110;
            int bx0 = (w - bw) / 2;
            int by0 = (h - bh) / 2;
            g.setColor(0x0B1528);
            g.fillRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setColor(0x22D3EE);
            g.drawRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setFont(bigFont);
            g.drawString(title, w / 2, by0 + 10, Graphics.TOP | Graphics.HCENTER);
            g.setFont(smallFont);
            g.setColor(0xFACC15);
            g.drawString(sub, w / 2, by0 + 34, Graphics.TOP | Graphics.HCENTER);
            g.setColor(menuIdx == 0 ? 0xFFFFFF : 0x94A3B8);
            g.drawString(o0, w / 2, by0 + 54, Graphics.TOP | Graphics.HCENTER);
            g.setColor(menuIdx == 1 ? 0xFFFFFF : 0x94A3B8);
            g.drawString(o1, w / 2, by0 + 72, Graphics.TOP | Graphics.HCENTER);
            if (!o2.isEmpty()) {
                g.setColor(menuIdx == 2 ? 0xF43F5E : 0x94A3B8);
                g.drawString(o2, w / 2, by0 + 90, Graphics.TOP | Graphics.HCENTER);
            }
        }

        private boolean isMenuKey(int keyCode) {
            return keyCode == 0 || keyCode == KEY_SOFT_LEFT || keyCode == KEY_SOFT_RIGHT || keyCode == KEY_END;
        }

        protected void keyPressed(int keyCode) {
            int act = 0;
            try { act = getGameAction(keyCode); } catch (Throwable ignored) {}

            if (screenState == 0) {
                if (isMenuKey(keyCode)) {
                    midlet.exitGame();
                    return;
                }
                resetMatch();
                screenState = 1;
                return;
            }

            if (screenState == 2 || screenState == 3) {
                int maxOpts = screenState == 2 ? 3 : 2;
                if (act == UP || keyCode == KEY_NUM2) {
                    menuIdx = (menuIdx + maxOpts - 1) % maxOpts;
                } else if (act == DOWN || keyCode == KEY_NUM8) {
                    menuIdx = (menuIdx + 1) % maxOpts;
                } else if (act == FIRE || keyCode == KEY_NUM5 || keyCode == KEY_FIRE || keyCode == KEY_SOFT_LEFT) {
                    if (menuIdx == 0) {
                        if (screenState == 3) resetMatch();
                        screenState = 1;
                    } else if (screenState == 2 && menuIdx == 1) {
                        resetMatch();
                        screenState = 1;
                    } else {
                        midlet.exitGame();
                    }
                } else if (isMenuKey(keyCode) && screenState == 2) {
                    screenState = 1;
                }
                repaint();
                return;
            }

            if (isMenuKey(keyCode)) {
                screenState = 2;
                menuIdx = 0;
                holdLeft = holdRight = false;
                repaint();
                return;
            }
            if (act == LEFT || keyCode == KEY_NUM4) holdLeft = true;
            if (act == RIGHT || keyCode == KEY_NUM6) holdRight = true;
        }

        protected void keyReleased(int keyCode) {
            int act = 0;
            try { act = getGameAction(keyCode); } catch (Throwable ignored) {}
            if (act == LEFT || keyCode == KEY_NUM4) holdLeft = false;
            if (act == RIGHT || keyCode == KEY_NUM6) holdRight = false;
        }
    }
}
