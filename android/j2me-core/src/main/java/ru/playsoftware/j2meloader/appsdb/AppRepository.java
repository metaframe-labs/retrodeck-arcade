package ru.playsoftware.j2meloader.appsdb;

import java.util.List;
import ru.playsoftware.j2meloader.applist.AppItem;

public class AppRepository {
    public AppItem get(int id) { return null; }
    public AppItem get(String name, String vendor) { return null; }
    public void insert(AppItem item) {}
    public void insert(List<AppItem> items) {}
    public void update(AppItem item) {}
    public void delete(AppItem item) {}
    public void delete(List<AppItem> items) {}
    public void deleteAll() {}
}
