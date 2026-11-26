package ru.playsoftware.j2meloader.applist;

public class AppItem {
    public int id;
    public String path;
    public String title;
    public String author;
    public String version;
    public String imagePathExt;

    public AppItem(String path, String title, String author, String version) {
        this.path = path;
        this.title = title;
        this.author = author;
        this.version = version;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getPath() { return path; }
    public String getPathExt() { return path; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthor() { return author; }
    public String getVersion() { return version; }
    public String getImagePathExt() { return imagePathExt; }
    public void setImagePathExt(String imagePathExt) { this.imagePathExt = imagePathExt; }
}
