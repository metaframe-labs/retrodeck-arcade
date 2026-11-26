package ru.woesss.j2me.installer;

import android.app.Application;
import android.net.Uri;
import java.io.File;
import io.reactivex.Single;
import ru.playsoftware.j2meloader.appsdb.AppRepository;

public final class InstallerHelper {
    public static String installJar(Application app, String jarPath) {
        File input = new File(jarPath);
        AppInstaller installer = new AppInstaller(jarPath, Uri.fromFile(input), app, new AppRepository());
        Single.<Integer>create(installer::loadInfo).blockingGet();
        Single.<Integer>create(installer::install).blockingGet();
        return installer.targetDir != null ? installer.targetDir.getAbsolutePath() : jarPath;
    }
}
