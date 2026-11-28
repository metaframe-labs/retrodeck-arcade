/*
 * Astro Blaster - Open Source J2ME Space Shooter (MIT License)
 * Built for RetroDeck OS embedded J2ME (MIDP 2.0 / CLDC 1.1)
 */
package retrodeck.j2me;

import java.util.Random;
import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Display;
import javax.microedition.lcdui.Font;
import javax.microedition.lcdui.Graphics;
import javax.microedition.midlet.MIDlet;
import javax.microedition.rms.RecordStore;

public class AstroBlaster extends MIDlet {
    private BlasterCanvas canvas;
    private boolean started = false;

    public void startApp() {
        if (!started) {
            started = true;
            canvas = new BlasterCanvas(this);
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

    private static final class BlasterCanvas extends Canvas implements Runnable {
        private static final String RMS_NAME = "astro_save";
        private final AstroBlaster midlet;
        private final Random rng = new Random();
        private final Font smallFont = Font.getFont(Font.FACE_MONOSPACE, Font.STYLE_BOLD, Font.SIZE_SMALL);
        private final Font bigFont = Font.getFont(Font.FACE_MONOSPACE, Font.STYLE_BOLD, Font.SIZE_LARGE);

        private volatile boolean running = false;
        private volatile boolean paused = false;
        private int screenState = 0; // 0 = title, 1 = playing, 2 = pause menu, 3 = game over
        private int menuIdx = 0;

        private int px = 120;
        private int py = 276;
        private int lives = 3;
        private int score = 0;
        private int bestScore = 0;
        private int wave = 1;
        private int fireCd = 0;
        private int hurtFlash = 0;
        private int spawnTimer = 0;
        private int tickCount = 0;

        private boolean holdLeft, holdRight, holdUp, holdDown, holdFire;
        private boolean autoFire = true;

        private final int[] starX = new int[36];
        private final int[] starY = new int[36];
        private final int[] starSpd = new int[36];

        private final int[] bx = new int[20];
        private final int[] by = new int[20];
        private final boolean[] bAlive = new boolean[20];

        private final int[] ex = new int[14];
        private final int[] ey = new int[14];
        private final int[] eType = new int[14]; // 0 = scout, 1 = cruiser, 2 = ufo
        private final int[] eHp = new int[14];
        private final boolean[] eAlive = new boolean[14];

        private final int[] fxX = new int[10];
        private final int[] fxY = new int[10];
        private final int[] fxLife = new int[10];

        BlasterCanvas(AstroBlaster midlet) {
            this.midlet = midlet;
            setFullScreenMode(true);
            loadBestScore();
            initStars();
            resetMatch();
        }

        private void initStars() {
            int w = Math.max(128, getWidth());
            int h = Math.max(128, getHeight());
            for (int i = 0; i < starX.length; i++) {
                starX[i] = rng.nextInt(w);
                starY[i] = rng.nextInt(h);
                starSpd[i] = 1 + (i % 3);
            }
        }

        private void loadBestScore() {
            RecordStore rs = null;
            try {
                rs = RecordStore.openRecordStore(RMS_NAME, true);
                if (rs.getNumRecords() > 0) {
                    byte[] data = rs.getRecord(1);
                    if (data != null && data.length >= 4) {
                        bestScore = ((data[0] & 0xFF) << 24)
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

        private void saveBestScore() {
            if (score <= bestScore) return;
            bestScore = score;
            RecordStore rs = null;
            try {
                rs = RecordStore.openRecordStore(RMS_NAME, true);
                byte[] data = new byte[] {
                    (byte) (bestScore >>> 24),
                    (byte) (bestScore >>> 16),
                    (byte) (bestScore >>> 8),
                    (byte) bestScore
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
            int h = Math.max(128, getHeight());
            px = w / 2;
            py = h - 36;
            lives = 3;
            score = 0;
            wave = 1;
            fireCd = 0;
            hurtFlash = 0;
            spawnTimer = 10;
            for (int i = 0; i < bAlive.length; i++) bAlive[i] = false;
            for (int i = 0; i < eAlive.length; i++) eAlive[i] = false;
            for (int i = 0; i < fxLife.length; i++) fxLife[i] = 0;
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
                long sleepMs = Math.max(12, 33 - dt);
                try {
                    Thread.sleep(sleepMs);
                } catch (InterruptedException ignored) {
                }
            }
        }

        private void tick() {
            tickCount++;
            int w = Math.max(128, getWidth());
            int h = Math.max(128, getHeight());

            for (int i = 0; i < starX.length; i++) {
                starY[i] += starSpd[i];
                if (starY[i] >= h) {
                    starY[i] = 0;
                    starX[i] = rng.nextInt(w);
                }
            }

            for (int i = 0; i < fxLife.length; i++) {
                if (fxLife[i] > 0) fxLife[i]--;
            }

            if (screenState != 1) return;

            int spd = 5;
            if (holdLeft) px -= spd;
            if (holdRight) px += spd;
            if (holdUp) py -= spd - 1;
            if (holdDown) py += spd - 1;
            if (px < 14) px = 14;
            if (px > w - 14) px = w - 14;
            if (py < 48) py = 48;
            if (py > h - 20) py = h - 20;

            if (hurtFlash > 0) hurtFlash--;
            if (fireCd > 0) fireCd--;

            if ((autoFire || holdFire) && fireCd <= 0) {
                spawnBullet(px - 6, py - 10);
                spawnBullet(px + 6, py - 10);
                fireCd = 7;
            }

            for (int i = 0; i < bAlive.length; i++) {
                if (!bAlive[i]) continue;
                by[i] -= 10;
                if (by[i] < -8) bAlive[i] = false;
            }

            wave = 1 + (score / 400);
            spawnTimer--;
            if (spawnTimer <= 0) {
                spawnEnemy(w);
                spawnTimer = Math.max(10, 26 - wave * 2);
            }

            for (int i = 0; i < eAlive.length; i++) {
                if (!eAlive[i]) continue;
                int eSpd = eType[i] == 2 ? 2 : (2 + (wave / 2));
                ey[i] += eSpd;
                if (eType[i] == 2) {
                    ex[i] += ((tickCount / 10) % 2 == 0) ? 2 : -2;
                    if (ex[i] < 16) ex[i] = 16;
                    if (ex[i] > w - 16) ex[i] = w - 16;
                }
                if (ey[i] > h + 16) {
                    eAlive[i] = false;
                    continue;
                }

                // Bullet collisions
                for (int b = 0; b < bAlive.length; b++) {
                    if (!bAlive[b]) continue;
                    if (Math.abs(bx[b] - ex[i]) < 12 && Math.abs(by[b] - ey[i]) < 12) {
                        bAlive[b] = false;
                        eHp[i]--;
                        if (eHp[i] <= 0) {
                            eAlive[i] = false;
                            spawnFx(ex[i], ey[i]);
                            score += eType[i] == 2 ? 50 : (eType[i] == 1 ? 25 : 10);
                            if (score > bestScore) saveBestScore();
                        }
                        break;
                    }
                }

                // Player collision
                if (eAlive[i] && hurtFlash == 0 && Math.abs(px - ex[i]) < 14 && Math.abs(py - ey[i]) < 14) {
                    eAlive[i] = false;
                    spawnFx(ex[i], ey[i]);
                    lives--;
                    hurtFlash = 24;
                    if (lives <= 0) {
                        saveBestScore();
                        screenState = 3;
                        menuIdx = 0;
                        return;
                    }
                }
            }
        }

        private void spawnBullet(int x, int y) {
            for (int i = 0; i < bAlive.length; i++) {
                if (!bAlive[i]) {
                    bx[i] = x;
                    by[i] = y;
                    bAlive[i] = true;
                    return;
                }
            }
        }

        private void spawnEnemy(int w) {
            for (int i = 0; i < eAlive.length; i++) {
                if (!eAlive[i]) {
                    eAlive[i] = true;
                    ex[i] = 18 + rng.nextInt(Math.max(1, w - 36));
                    ey[i] = -12;
                    int r = rng.nextInt(10);
                    eType[i] = r == 0 ? 2 : (r < 4 ? 1 : 0);
                    eHp[i] = eType[i] == 2 ? 3 : (eType[i] == 1 ? 2 : 1);
                    return;
                }
            }
        }

        private void spawnFx(int x, int y) {
            for (int i = 0; i < fxLife.length; i++) {
                if (fxLife[i] <= 0) {
                    fxX[i] = x;
                    fxY[i] = y;
                    fxLife[i] = 10;
                    return;
                }
            }
        }

        protected void paint(Graphics g) {
            int w = getWidth();
            int h = getHeight();

            // Deep space backdrop
            g.setColor(0x050B16);
            g.fillRect(0, 0, w, h);

            // Stars
            for (int i = 0; i < starX.length; i++) {
                g.setColor(starSpd[i] == 3 ? 0x38BDF8 : (starSpd[i] == 2 ? 0x94A3B8 : 0x334155));
                g.fillRect(starX[i], starY[i], starSpd[i] == 3 ? 2 : 1, starSpd[i] == 3 ? 2 : 1);
            }

            // Explosions
            for (int i = 0; i < fxLife.length; i++) {
                if (fxLife[i] > 0) {
                    int rad = (11 - fxLife[i]) * 2;
                    g.setColor(fxLife[i] > 5 ? 0xFACC15 : 0xF97316);
                    g.drawArc(fxX[i] - rad / 2, fxY[i] - rad / 2, rad, rad, 0, 360);
                }
            }

            // Enemies
            for (int i = 0; i < eAlive.length; i++) {
                if (!eAlive[i]) continue;
                int x = ex[i], y = ey[i];
                if (eType[i] == 2) {
                    g.setColor(0xA855F7);
                    g.fillRoundRect(x - 11, y - 5, 22, 10, 6, 6);
                    g.setColor(0xE9D5FF);
                    g.fillRect(x - 5, y - 8, 10, 4);
                } else if (eType[i] == 1) {
                    g.setColor(0xF43F5E);
                    g.fillRect(x - 8, y - 6, 16, 10);
                    g.setColor(0xFDA4AF);
                    g.fillRect(x - 3, y + 4, 6, 4);
                } else {
                    g.setColor(0xFB923C);
                    g.fillTriangle(x - 7, y - 6, x + 7, y - 6, x, y + 7);
                }
            }

            // Lasers
            g.setColor(0x22D3EE);
            for (int i = 0; i < bAlive.length; i++) {
                if (bAlive[i]) g.fillRect(bx[i] - 1, by[i] - 5, 2, 9);
            }

            // Player Ship
            if (hurtFlash % 4 < 2) {
                g.setColor(0x10B981);
                g.fillTriangle(px, py - 12, px - 11, py + 8, px + 11, py + 8);
                g.setColor(0x6EE7B7);
                g.fillTriangle(px, py - 8, px - 4, py + 4, px + 4, py + 4);
                g.setColor(0x22D3EE);
                g.fillRect(px - 2, py + 8, 4, 4 + (tickCount % 3));
            }

            // Top HUD
            g.setColor(0x0F172A);
            g.fillRect(0, 0, w, 20);
            g.setColor(0x22D3EE);
            g.drawLine(0, 20, w, 20);
            g.setFont(smallFont);
            g.setColor(0xF8FAFC);
            g.drawString("SC:" + score, 6, 3, Graphics.TOP | Graphics.LEFT);
            g.setColor(0xFACC15);
            g.drawString("HI:" + bestScore, w / 2, 3, Graphics.TOP | Graphics.HCENTER);
            g.setColor(0x34D399);
            g.drawString("HP:" + lives, w - 6, 3, Graphics.TOP | Graphics.RIGHT);

            if (screenState == 0) {
                drawDialog(g, w, h, "ASTRO BLASTER", "HI-SCORE: " + bestScore, "[A]/[5] START", "MENU: BACK/SOFT");
            } else if (screenState == 2 || screenState == 3) {
                String title = screenState == 2 ? "PAUSED" : "GAME OVER";
                String opt0 = (menuIdx == 0 ? "> " : "  ") + (screenState == 2 ? "RESUME" : "PLAY AGAIN");
                String opt1 = (menuIdx == 1 ? "> " : "  ") + (screenState == 2 ? "RESTART" : "AUTO-FIRE: " + (autoFire ? "ON" : "OFF"));
                String opt2 = (menuIdx == 2 ? "> " : "  ") + "EXIT TO OS";
                drawMenuBox(g, w, h, title, "SCORE: " + score + "  HI: " + bestScore, opt0, opt1, opt2);
            }
        }

        private void drawDialog(Graphics g, int w, int h, String title, String l1, String l2, String l3) {
            int bw = Math.min(w - 24, 196);
            int bh = 104;
            int bx0 = (w - bw) / 2;
            int by0 = (h - bh) / 2;
            g.setColor(0x0B1528);
            g.fillRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setColor(0x22D3EE);
            g.drawRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setFont(bigFont);
            g.drawString(title, w / 2, by0 + 12, Graphics.TOP | Graphics.HCENTER);
            g.setFont(smallFont);
            g.setColor(0xFACC15);
            g.drawString(l1, w / 2, by0 + 38, Graphics.TOP | Graphics.HCENTER);
            g.setColor(0x34D399);
            g.drawString(l2, w / 2, by0 + 58, Graphics.TOP | Graphics.HCENTER);
            g.setColor(0x94A3B8);
            g.drawString(l3, w / 2, by0 + 78, Graphics.TOP | Graphics.HCENTER);
        }

        private void drawMenuBox(Graphics g, int w, int h, String title, String sub, String o0, String o1, String o2) {
            int bw = Math.min(w - 24, 196);
            int bh = 114;
            int bx0 = (w - bw) / 2;
            int by0 = (h - bh) / 2;
            g.setColor(0x0B1528);
            g.fillRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setColor(0xA855F7);
            g.drawRoundRect(bx0, by0, bw, bh, 10, 10);
            g.setFont(bigFont);
            g.setColor(0x22D3EE);
            g.drawString(title, w / 2, by0 + 10, Graphics.TOP | Graphics.HCENTER);
            g.setFont(smallFont);
            g.setColor(0xFACC15);
            g.drawString(sub, w / 2, by0 + 34, Graphics.TOP | Graphics.HCENTER);
            g.setColor(menuIdx == 0 ? 0xFFFFFF : 0x94A3B8);
            g.drawString(o0, w / 2, by0 + 54, Graphics.TOP | Graphics.HCENTER);
            g.setColor(menuIdx == 1 ? 0xFFFFFF : 0x94A3B8);
            g.drawString(o1, w / 2, by0 + 72, Graphics.TOP | Graphics.HCENTER);
            g.setColor(menuIdx == 2 ? 0xF43F5E : 0x94A3B8);
            g.drawString(o2, w / 2, by0 + 90, Graphics.TOP | Graphics.HCENTER);
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
                if (act == UP || keyCode == KEY_NUM2) {
                    menuIdx = (menuIdx + 2) % 3;
                } else if (act == DOWN || keyCode == KEY_NUM8) {
                    menuIdx = (menuIdx + 1) % 3;
                } else if (act == FIRE || keyCode == KEY_NUM5 || keyCode == KEY_FIRE || keyCode == KEY_SOFT_LEFT) {
                    if (menuIdx == 0) {
                        if (screenState == 3) resetMatch();
                        screenState = 1;
                    } else if (menuIdx == 1) {
                        if (screenState == 2) {
                            resetMatch();
                            screenState = 1;
                        } else {
                            autoFire = !autoFire;
                        }
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
                holdLeft = holdRight = holdUp = holdDown = holdFire = false;
                repaint();
                return;
            }
            if (act == LEFT || keyCode == KEY_NUM4) holdLeft = true;
            if (act == RIGHT || keyCode == KEY_NUM6) holdRight = true;
            if (act == UP || keyCode == KEY_NUM2) holdUp = true;
            if (act == DOWN || keyCode == KEY_NUM8) holdDown = true;
            if (act == FIRE || keyCode == KEY_NUM5 || keyCode == KEY_FIRE) holdFire = true;
            if (keyCode == KEY_STAR) autoFire = !autoFire;
        }

        protected void keyReleased(int keyCode) {
            int act = 0;
            try { act = getGameAction(keyCode); } catch (Throwable ignored) {}
            if (act == LEFT || keyCode == KEY_NUM4) holdLeft = false;
            if (act == RIGHT || keyCode == KEY_NUM6) holdRight = false;
            if (act == UP || keyCode == KEY_NUM2) holdUp = false;
            if (act == DOWN || keyCode == KEY_NUM8) holdDown = false;
            if (act == FIRE || keyCode == KEY_NUM5 || keyCode == KEY_FIRE) holdFire = false;
        }
    }
}
